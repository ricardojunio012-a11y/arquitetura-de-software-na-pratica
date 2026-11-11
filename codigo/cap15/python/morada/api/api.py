# A API pública do Morada para administradoras. Os erros seguem a RFC 9457 (problem
# details), a listagem é paginada por cursor e o pagamento exige uma chave de
# idempotência no cabeçalho Idempotency-Key. Cada administradora só enxerga os
# condomínios que administra.
import base64
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import psycopg

PROBLEMAS = "https://api.morada.example/problemas/"


class Problema(Exception):
    def __init__(self, status: int, tipo: str, titulo: str, detalhe: str):
        super().__init__(detalhe)
        self.status = status
        self.tipo = tipo
        self.titulo = titulo

    @property
    def corpo(self) -> dict:
        return {
            "type": PROBLEMAS + self.tipo,
            "title": self.titulo,
            "status": self.status,
            "detail": str(self),
        }


def para_json(dados) -> str:
    return json.dumps(dados, ensure_ascii=False, separators=(",", ":"))


# O cursor é opaco para o cliente: o último identificador da página, em base64url
def cursor_de(id: str) -> str:
    return base64.urlsafe_b64encode(id.encode()).decode().rstrip("=")


def id_do_cursor(cursor: str) -> str:
    return base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode()


def listar_cobrancas(
    banco, administradora: str, condominio: str, consulta: dict
) -> tuple[int, dict]:
    recebido = consulta.get("limite", ["20"])[0]
    limite = int(recebido) if recebido.isdigit() else 0
    if not 1 <= limite <= 100:
        raise Problema(
            400,
            "limite-invalido",
            "Limite inválido",
            f"limite deve estar entre 1 e 100, recebido {recebido}",
        )
    situacao = consulta.get("situacao", [None])[0]
    if situacao is not None and situacao not in ("aberta", "paga"):
        raise Problema(
            400,
            "situacao-invalida",
            "Situação inválida",
            f"situação deve ser aberta ou paga, recebido {situacao}",
        )
    # Autorização por objeto: o condomínio de outra administradora responde como se
    # não existisse, para não revelar nem que ele existe
    existe = banco.execute(
        "SELECT 1 FROM condominios WHERE id = %s AND administradora = %s",
        [condominio, administradora],
    ).fetchone()
    if existe is None:
        raise Problema(
            404,
            "condominio-inexistente",
            "Condomínio não encontrado",
            f"não existe o condomínio {condominio}",
        )
    cursor = consulta.get("cursor", [None])[0]
    depois_de = id_do_cursor(cursor) if cursor else ""
    # Uma linha a mais que o limite diz se existe a próxima página
    linhas = banco.execute(
        """SELECT id, unidade, vencimento::text, valor_centavos, situacao
           FROM cobrancas
           WHERE condominio = %s AND (%s::text IS NULL OR situacao = %s) AND id > %s
           ORDER BY id LIMIT %s""",
        [condominio, situacao, situacao, depois_de, limite + 1],
    ).fetchall()
    dados = [
        {
            "id": id,
            "unidade": unidade,
            "vencimento": vencimento,
            "valorCentavos": valor,
            "situacao": situacao_atual,
        }
        for id, unidade, vencimento, valor, situacao_atual in linhas[:limite]
    ]
    proximo = cursor_de(dados[-1]["id"]) if len(linhas) > limite else None
    return 200, {"dados": dados, "proximo": proximo}


# As regras do pagamento, dentro da transação aberta por registrar_pagamento
def pagar(banco, administradora: str, pedido: dict) -> tuple[int, dict]:
    # A cobrança precisa ser de um condomínio da própria administradora
    cobranca = banco.execute(
        """SELECT valor_centavos, situacao FROM cobrancas
           WHERE id = %s AND condominio IN
             (SELECT id FROM condominios WHERE administradora = %s)
           FOR UPDATE""",
        [pedido["cobranca"], administradora],
    ).fetchone()
    if cobranca is None:
        raise Problema(
            422,
            "cobranca-inexistente",
            "Cobrança não encontrada",
            f"não existe a cobrança {pedido['cobranca']}",
        )
    valor, situacao = cobranca
    if situacao == "paga":
        raise Problema(
            409,
            "cobranca-paga",
            "Cobrança já paga",
            f"a cobrança {pedido['cobranca']} já foi paga",
        )
    if valor != pedido["valorCentavos"]:
        raise Problema(
            422,
            "valor-divergente",
            "Valor divergente",
            f"a cobrança {pedido['cobranca']} vale {valor} centavos, "
            f"e o pagamento informou {pedido['valorCentavos']}",
        )
    (id,) = banco.execute(
        "SELECT 'PG-' || lpad(nextval('pagamentos_seq')::text, 4, '0')"
    ).fetchone()
    banco.execute(
        "INSERT INTO pagamentos VALUES (%s, %s, %s)",
        [id, pedido["cobranca"], pedido["valorCentavos"]],
    )
    banco.execute(
        "UPDATE cobrancas SET situacao = 'paga' WHERE id = %s", [pedido["cobranca"]]
    )
    return 201, {"id": id, **pedido, "situacao": "confirmado"}


# Chave de idempotência: a chave e a resposta são gravadas na mesma transação do
# pagamento. Repetir o pedido devolve a resposta guardada, sem pagar de novo. A chave
# vale dentro de uma administradora: duas administradoras podem gerar a mesma.
def registrar_pagamento(
    banco, administradora: str, chave: str | None, corpo: dict
) -> tuple[int, dict]:
    if not chave:
        raise Problema(
            400,
            "chave-ausente",
            "Chave de idempotência ausente",
            "envie o cabeçalho Idempotency-Key com um identificador único do pedido",
        )
    valor = corpo.get("valorCentavos")
    if not isinstance(corpo.get("cobranca"), str) or type(valor) is not int:
        raise Problema(
            400,
            "pedido-invalido",
            "Pedido inválido",
            "informe cobranca (texto) e valorCentavos (inteiro)",
        )
    # A forma canônica do pedido: só os campos que a operação usa, sempre na mesma
    # ordem. A ordem dos campos no JSON do cliente não muda a comparação.
    pedido = {"cobranca": corpo["cobranca"], "valorCentavos": valor}
    with banco.transaction():
        # Quem grava a chave primeiro processa o pedido. Um pedido simultâneo com a
        # mesma chave espera aqui o primeiro terminar e encontra a resposta pronta.
        nova = banco.execute(
            "INSERT INTO chaves_idempotencia (administradora, chave, pedido) "
            "VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            [administradora, chave, para_json(pedido)],
        )
        if nova.rowcount == 0:
            anterior, status, resposta = banco.execute(
                "SELECT pedido, status, resposta FROM chaves_idempotencia "
                "WHERE administradora = %s AND chave = %s",
                [administradora, chave],
            ).fetchone()
        else:
            try:
                status, corpo_resposta = pagar(banco, administradora, pedido)
            except Problema as problema:
                status, corpo_resposta = problema.status, problema.corpo
            resposta = para_json(corpo_resposta)
            banco.execute(
                "UPDATE chaves_idempotencia SET status = %s, resposta = %s "
                "WHERE administradora = %s AND chave = %s",
                [status, resposta, administradora, chave],
            )
            anterior = para_json(pedido)
    if anterior != para_json(pedido):
        raise Problema(
            422,
            "chave-reutilizada",
            "Chave de idempotência reutilizada",
            f"a chave {chave} já foi usada com outro pedido",
        )
    return status, json.loads(resposta)


ROTA_COBRANCAS = re.compile(r"^/v1/condominios/([^/]+)/cobrancas$")


def criar_api(url_banco: str) -> ThreadingHTTPServer:
    class Tratador(BaseHTTPRequestHandler):
        def atender(self, metodo: str):
            url = urlsplit(self.path)
            # Uma conexão por pedido: pedidos simultâneos usam transações separadas
            with psycopg.connect(url_banco, autocommit=True) as banco:
                try:
                    # Em produção, o gateway valida o token OAuth 2.0 e repassa a
                    # administradora dona do token. No laboratório, o cabeçalho
                    # Morada-Administradora faz esse papel, e quem o envia é tratado
                    # como autenticado.
                    administradora = self.headers.get("Morada-Administradora")
                    if not administradora:
                        raise Problema(
                            401,
                            "nao-autenticado",
                            "Cliente não identificado",
                            "envie o token de acesso (aqui, o cabeçalho "
                            "Morada-Administradora)",
                        )
                    cobrancas = ROTA_COBRANCAS.match(url.path)
                    if metodo == "GET" and cobrancas:
                        consulta = parse_qs(url.query)
                        status, corpo = listar_cobrancas(
                            banco, administradora, cobrancas.group(1), consulta
                        )
                    elif metodo == "POST" and url.path == "/v1/pagamentos":
                        tamanho = int(self.headers["Content-Length"])
                        pedido = json.loads(self.rfile.read(tamanho))
                        chave = self.headers.get("Idempotency-Key")
                        status, corpo = registrar_pagamento(
                            banco, administradora, chave, pedido
                        )
                    else:
                        raise Problema(
                            404,
                            "rota-inexistente",
                            "Rota não encontrada",
                            f"não existe {metodo} {url.path}",
                        )
                except Problema as problema:
                    status, corpo = problema.status, problema.corpo
            tipo = "application/problem+json" if status >= 400 else "application/json"
            dados = para_json(corpo).encode()
            self.send_response(status)
            self.send_header("Content-Type", tipo)
            # O 401 diz ao cliente como se autenticar (RFC 9110)
            if status == 401:
                self.send_header("WWW-Authenticate", "Bearer")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        def do_GET(self):
            self.atender("GET")

        def do_POST(self):
            self.atender("POST")

        def log_message(self, *args):
            pass

    return ThreadingHTTPServer(("127.0.0.1", 0), Tratador)


# Sobe o servidor numa thread e devolve o endereço
def subir(servidor: ThreadingHTTPServer) -> str:
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{servidor.server_address[1]}"
