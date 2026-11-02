# Uso: python -m morada.depois.main <comandos.json> <pasta-de-saída>
# Monta o repositório e o serviço de aplicação e executa os comandos em ordem.
import json
import os
import sys

from morada.depois.aplicacao.repositorio import AgendasEmMemoria
from morada.depois.aplicacao.servico_de_reservas import ServicoDeReservas
from morada.depois.dominio.agenda import PoliticaDeUso
from morada.depois.dominio.dinheiro import Dinheiro
from morada.depois.dominio.eventos import ReservaConfirmada

entrada, saida = sys.argv[1:3]
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
politicas = {
    e["id"]: PoliticaDeUso(
        Dinheiro(e["taxaCentavos"]), e["antecedenciaMinimaDias"], e["limitePorMes"]
    )
    for e in dados["espacos"]
}

eventos = []


def publicar(e):
    if isinstance(e, ReservaConfirmada):
        linha = f"{e.reserva};{e.espaco};{e.periodo};{e.unidade};{e.taxa}"
    else:
        linha = f"{e.reserva};" + (
            f"multa {e.multa}" if e.multa.centavos else "sem multa"
        )
    eventos.append(f"{type(e).__name__};{linha}")


agendas = AgendasEmMemoria(politicas)
servico = ServicoDeReservas(agendas, publicar)
resultados = []
for c in dados["comandos"]:
    r = servico.executar(c)
    resultados.append(f"{r.reserva};{r.comando};{r.situacao};{r.detalhe}")
agenda = [
    f"{a.espaco};{r.id};{r.periodo};{r.unidade}"
    for a in agendas.todas()
    for r in a.ativas()
]

os.makedirs(saida, exist_ok=True)
for nome, linhas in (
    ("resultados", resultados),
    ("eventos", eventos),
    ("agenda", agenda),
):
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
print(f"{len(resultados)} comandos executados; saída em {saida}")
