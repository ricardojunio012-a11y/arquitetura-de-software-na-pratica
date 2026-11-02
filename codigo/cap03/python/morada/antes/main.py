# Uso: python -m morada.antes.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import json
import os
import sys
from datetime import date

from morada.antes.config.config import config
from morada.antes.servicos.servicos import calcular_todas, gerar_saida

entrada, saida, *opcoes = sys.argv[1:]
config.hoje = (
    date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
)
with open(entrada, encoding="utf-8") as f:
    config.dados = json.load(f)
calcular_todas()

# A ordem importa: a inadimplência reordena a lista de cobranças
os.makedirs(saida, exist_ok=True)
for tipo in ("cobrancas", "inadimplencia", "prestacao"):
    with open(os.path.join(saida, f"{tipo}.txt"), "w", encoding="utf-8") as f:
        f.write(gerar_saida(tipo))
print("relatórios gerados em " + saida)
