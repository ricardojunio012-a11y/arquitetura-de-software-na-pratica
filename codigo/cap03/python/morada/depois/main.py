# Uso: python -m morada.depois.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Monta os módulos; a ordem dos relatórios não importa mais.
import json
import os
import sys
from datetime import date

from morada.depois.cobranca import calcular_cobrancas, relatorio_de_cobrancas
from morada.depois.inadimplencia import relatorio_de_inadimplencia
from morada.depois.prestacao import prestacao_de_contas

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
nome = dados["condominio"]["nome"]
cobrancas = calcular_cobrancas(
    dados["condominio"]["despesasDoMesCentavos"], dados["unidades"], hoje
)

relatorios = {
    "inadimplencia": relatorio_de_inadimplencia(nome, hoje, cobrancas),
    "cobrancas": relatorio_de_cobrancas(nome, hoje, cobrancas),
    "prestacao": prestacao_de_contas(
        nome,
        hoje,
        cobrancas,
        dados["despesas"],
        dados["fundoDeReservaSaldoAnteriorCentavos"],
    ),
}
os.makedirs(saida, exist_ok=True)
for tipo, texto in relatorios.items():
    with open(os.path.join(saida, f"{tipo}.txt"), "w", encoding="utf-8") as f:
        f.write(texto)
print("relatórios gerados em " + saida)
