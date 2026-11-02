# Uso: python -m morada.main memoria|escrita-dupla|outbox <pasta-de-saída>
# O Financeiro confirma três pagamentos; Reservas e Comunicação reagem ao evento.
import json
import sys
from pathlib import Path

from morada.eventos import evento_de
from morada.infra.banco import conectar_banco, gravar_com_outbox, gravar_pagamento
from morada.infra.broker import FILAS, conectar_broker, consumir_tudo, publicar
from morada.modulos.comunicacao import Comunicacao
from morada.modulos.reservas import Reservas

versao, saida = sys.argv[1], Path(sys.argv[2])
cenario = json.loads(Path("/dados/entrada/cenario.json").read_text("utf-8"))
pagamentos = cenario["pagamentos"]
reservas = Reservas(cenario["reservas"])
comunicacao = Comunicacao()
execucao: list[str] = []


# Barramento em memória: os assinantes rodam na hora, no mesmo processo
def rodar_em_memoria():
    assinantes = [reservas.ao_confirmar_pagamento, comunicacao.ao_confirmar_pagamento]
    for p in pagamentos:
        e = evento_de(p)
        execucao.append(
            f"{p['pagamento']} confirmado; {e['evento']} entregue em memória"
        )
        for assinante in assinantes:
            assinante(e)


# O relay lê a outbox e publica o que falta; só marca como publicado depois
def rodar_relay(banco, canal, cai_antes_de_marcar: set[str]):
    linhas = banco.execute(
        "SELECT id, evento, conteudo FROM outbox WHERE NOT publicado ORDER BY id"
    ).fetchall()
    for id, evento, conteudo in linhas:
        publicar(canal, json.loads(conteudo))
        if evento in cai_antes_de_marcar:
            cai_antes_de_marcar.discard(evento)
            execucao.append(f"relay publicou {evento} e caiu antes de marcar")
            return
        banco.execute("UPDATE outbox SET publicado = true WHERE id = %s", (id,))
        execucao.append(f"relay publicou {evento}")


def rodar_com_broker(com_outbox: bool):
    banco = conectar_banco()
    canal, conexao = conectar_broker()
    for p in pagamentos:
        e = evento_de(p)
        if com_outbox:
            gravar_com_outbox(banco, p, e)
            execucao.append(f"{p['pagamento']} gravado com {e['evento']} na outbox")
            continue
        # Escrita dupla: grava no banco e depois publica, em dois passos separados
        gravar_pagamento(banco, p)
        if p.get("falha") == "depois-de-gravar":
            execucao.append(
                f"{p['pagamento']} gravado; o processo caiu antes de publicar"
            )
            continue
        publicar(canal, e)
        execucao.append(f"{p['pagamento']} gravado; {e['evento']} publicado")
    if com_outbox:
        cai = {
            f"E-{p['pagamento']}"
            for p in pagamentos
            if p.get("falha") == "relay-antes-de-marcar"
        }
        rodar_relay(banco, canal, cai)
        rodar_relay(banco, canal, cai)
    consumir_tudo(canal, FILAS[0], reservas.ao_confirmar_pagamento)
    consumir_tudo(canal, FILAS[1], comunicacao.ao_confirmar_pagamento)
    conexao.close()
    banco.close()


if versao == "memoria":
    rodar_em_memoria()
else:
    rodar_com_broker(versao == "outbox")

saida.mkdir(parents=True, exist_ok=True)
for nome, linhas in [
    ("execucao.txt", execucao),
    ("consumo.txt", reservas.registro + comunicacao.registro),
    ("resultado.txt", reservas.linhas() + comunicacao.avisos),
]:
    (saida / nome).write_text("\n".join(linhas) + "\n", encoding="utf-8")
print(f"{versao}: saída em {saida}")
