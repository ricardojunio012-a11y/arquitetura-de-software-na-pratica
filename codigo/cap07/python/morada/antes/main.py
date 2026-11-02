# Uso: python -m morada.antes.main <comandos.json> <pasta-de-saída>
import json
import os
import sys

from morada.antes.modelo import reservas
from morada.antes.servico import cancelar, reservar

entrada, saida = sys.argv[1:3]
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
eventos, resultados = [], []
for c in dados["comandos"]:
    espaco = next((e for e in dados["espacos"] if e["id"] == c.get("espaco")), None)
    r = (
        reservar(c, espaco, eventos)
        if c["tipo"] == "reservar"
        else cancelar(c, eventos)
    )
    resultados.append(f"{c['reserva']};{c['tipo']};{r}")
agenda = [
    f"{r.espaco};{r.id};{r.data} {r.inicio}h-{r.fim}h;{r.unidade}"
    for e in dados["espacos"]
    for r in reservas
    if r.espaco == e["id"] and r.situacao == "confirmada"
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
