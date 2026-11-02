# Uso: python -m morada.etapa5.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# O main faz toda a entrada e saída; o módulo de reservas não toca em arquivos.
import json
import os
import sys
from datetime import date

from morada.etapa5.reservas import avisos, decidir, relatorio

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    decisoes = decidir(json.load(f), hoje)

# Aqui entraria o cliente de e-mail de verdade; no laboratório, um arquivo
emails = [f"para {para}: {texto}" for para, texto in avisos(decisoes)]
os.makedirs(saida, exist_ok=True)
for nome, linhas in (("reservas", relatorio(decisoes)), ("emails", emails)):
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
