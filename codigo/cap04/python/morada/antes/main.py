# Uso: python -m morada.antes.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# O gateway está fixo no código: a variável GATEWAY não muda nada aqui.
import json
import os
import sys
from datetime import date

from morada.antes.emissao import emitir_cobrancas

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
cobrancas, registros = emitir_cobrancas(dados, hoje)
os.makedirs(saida, exist_ok=True)
for nome, texto in (("cobrancas", cobrancas), ("registros", registros)):
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write(texto)
print("cobranças emitidas em " + saida)
