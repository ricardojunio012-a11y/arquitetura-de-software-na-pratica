# Teste de contrato do lado do consumidor. Um dublê responde exatamente o que cada
# interação promete; o cliente real do monólito conversa com ele. Se o cliente
# entende todas as respostas, as interações viram o contrato publicado.
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from morada.comunicacao.api import responder, subir
from morada.contrato.interacoes import INTERACOES
from morada.monolito.cliente import ClienteComunicacao

saida = Path(sys.argv[1])
atual: dict = {}


# O dublê do provedor: confere o pedido e devolve a resposta combinada
class Duble(BaseHTTPRequestHandler):
    def do_POST(self):
        corpo = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        esperado = atual["requisicao"]
        igual = (
            self.command == esperado["metodo"]
            and self.path == esperado["caminho"]
            and corpo == esperado["corpo"]
        )
        if igual:
            responder(self, atual["resposta"]["status"], atual["resposta"]["corpo"])
        else:
            responder(self, 500, {"erro": "pedido inesperado"})

    def log_message(self, *args):
        pass


duble = HTTPServer(("127.0.0.1", 0), Duble)
cliente = ClienteComunicacao(subir(duble))

# O que o monólito precisa entender de cada resposta
esperado = {
    "envio de um aviso novo": {"ok": True, "repetido": False},
    "reenvio de um aviso já enviado": {"ok": True, "repetido": True},
    "aviso sem texto": {"ok": False, "erro": "texto obrigatório"},
}

relatorio = []
for interacao in INTERACOES:
    atual = interacao
    corpo = interacao["requisicao"]["corpo"]
    obtido = cliente.avisar(corpo["id"], corpo["texto"])
    ok = obtido == esperado[interacao["descricao"]]
    relatorio.append(
        f"{interacao['descricao']}: {'o cliente entendeu' if ok else 'FALHOU'}"
    )
duble.shutdown()

contrato = {
    "consumidor": "monolito",
    "provedor": "comunicacao",
    "interacoes": INTERACOES,
}
(saida / "consumidor").mkdir(parents=True, exist_ok=True)
(saida / "consumidor" / "contrato.json").write_text(
    json.dumps(contrato, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(saida / "consumidor" / "relatorio.txt").write_text(
    "\n".join(relatorio) + "\n", encoding="utf-8"
)
print(f"consumidor: {len(INTERACOES)} interações no contrato")
