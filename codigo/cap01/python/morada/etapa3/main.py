# Uso: python -m morada.etapa3.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Único lugar que conhece arquivos, relógio e implementações concretas.
import json
import os
import sys
from datetime import date

from morada.etapa3.aplicacao import gerar_cobranca_mensal
from morada.etapa3.notificacao import EmailEmArquivo
from morada.etapa3.pagamento import Boleto

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)

os.makedirs(saida, exist_ok=True)
relatorio = gerar_cobranca_mensal(
    dados, hoje, Boleto(), EmailEmArquivo(os.path.join(saida, "emails.txt"))
)
relatorio.salvar(os.path.join(saida, "cobrancas.txt"))
print("cobranças geradas em " + saida)
