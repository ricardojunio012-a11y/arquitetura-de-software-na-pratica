# Uso: python -m morada.etapa4.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Único lugar que conhece arquivos, relógio e implementações concretas.
import json
import os
import sys
from datetime import date

from morada.etapa4.aplicacao import gerar_cobranca_mensal
from morada.etapa4.notificacao import EmailEmArquivo
from morada.etapa4.pagamento import Boleto
from morada.etapa4.pix import Pix
from morada.etapa4.whatsapp import WhatsAppEmArquivo

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)

os.makedirs(saida, exist_ok=True)
meios_de_pagamento = {"boleto": Boleto(), "pix": Pix()}
notificadores = {
    "email": EmailEmArquivo(os.path.join(saida, "emails.txt")),
    "whatsapp": WhatsAppEmArquivo(os.path.join(saida, "whatsapp.txt")),
}
relatorio = gerar_cobranca_mensal(dados, hoje, meios_de_pagamento, notificadores)
relatorio.salvar(os.path.join(saida, "cobrancas.txt"))
print("cobranças geradas em " + saida)
