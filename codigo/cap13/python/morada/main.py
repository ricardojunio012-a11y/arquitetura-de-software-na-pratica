# Uso: python -m morada.main online|offline|reinicio|persistida <pasta-de-saída>
# Simula uma manhã na portaria com dois tablets. Na versão offline, o tablet A perde
# a internet, trabalha com a fila local e sincroniza ao voltar.
import json
import sys
from pathlib import Path

from morada.backend import Portaria, Reservas
from morada.bff import BffPorteiro
from morada.tablet import Tablet

versao, saida = sys.argv[1], Path(sys.argv[2])
cenario = json.loads(Path("/dados/entrada/cenario.json").read_text("utf-8"))
portaria = Portaria(cenario["encomendas"])
reservas = Reservas(cenario["convidados"])
# Na versão persistida, o resultado de cada operação vai para uma tabela que
# sobrevive ao processo do BFF; nas outras, fica só na memória dele
tabela_de_operacoes: dict[str, str] = {}


def novo_bff() -> BffPorteiro:
    guardar = tabela_de_operacoes if versao == "persistida" else {}
    return BffPorteiro(portaria, reservas, guardar)


bff = novo_bff()
registro: list[str] = []
tablets = {nome: Tablet(nome, lambda: bff, registro) for nome in ("A", "B")}

for passo in cenario["passos"]:
    if versao not in passo.get("so", [versao]):
        continue
    acao = passo["acao"]
    if acao == "reiniciarBff":
        bff = novo_bff()
        registro.append("o BFF reiniciou: o que estava só na memória dele se perdeu")
        continue
    tablet = tablets[passo["tablet"]]
    if acao == "abrir":
        tablet.abrir()
    elif acao == "desconectar":
        tablet.desconectar()
    elif acao == "reconectar":
        tablet.reconectar(passo["perderResposta"])
    elif acao == "reenviar":
        tablet.reenviar()
    else:
        dados = {k: v for k, v in passo.items() if k not in ("tablet", "acao")}
        tablet.operar({"tipo": acao, **dados})

estado = [
    (
        f"{e['encomenda']} {e['unidade']}: {e['situacao']} "
        f"pelo tablet {e['por']} às {e['hora']}"
        if "por" in e
        else f"{e['encomenda']} {e['unidade']}: {e['situacao']}"
    )
    for e in portaria.encomendas.values()
]
estado += [
    f"{v['nome']} ({v['reserva']}) entrou às {v['hora']} pelo tablet {v['tablet']}"
    for v in portaria.visitantes
]
estado.append(f"operações repetidas ignoradas: {bff.repetidas}")

(saida / versao).mkdir(parents=True, exist_ok=True)
(saida / versao / "registro.txt").write_text("\n".join(registro) + "\n", "utf-8")
(saida / versao / "estado.txt").write_text("\n".join(estado) + "\n", "utf-8")
print(f"{versao}: saída em {saida / versao}")
