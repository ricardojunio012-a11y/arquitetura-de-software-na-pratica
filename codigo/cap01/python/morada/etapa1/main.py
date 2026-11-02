# Uso: python -m morada.etapa1.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import sys
from datetime import date

from morada.etapa1.cobranca import gerar_cobranca_mensal

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else None
gerar_cobranca_mensal(entrada, saida, hoje)
print("cobranças geradas em " + saida)
