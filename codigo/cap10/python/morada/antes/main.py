# Uso: python -m morada.antes.main <comandos.json> <pasta-de-saída>
# Monta os módulos e executa os comandos do Financeiro e de Reservas em ordem.
import json
import sys
from pathlib import Path

from morada.antes.modulos.financeiro.api import Financeiro
from morada.antes.modulos.financeiro.interno.tabela_de_cobrancas import (
    TabelaDeCobrancas,
)
from morada.antes.modulos.reservas.api import RecusaErro, Reservas
from morada.antes.modulos.reservas.interno.situacao_financeira import (
    SituacaoPelaTabela,
)

entrada, saida = sys.argv[1], Path(sys.argv[2])
dados = json.loads(Path(entrada).read_text(encoding="utf-8"))
tabela = TabelaDeCobrancas()
financeiro = Financeiro(tabela)
# O atalho: Reservas recebe a tabela do Financeiro, e não a API dele
reservas = Reservas(dados["espacos"], SituacaoPelaTabela(tabela))


def executar(c: dict) -> tuple[str, str, str]:
    if c["tipo"] == "emitir":
        detalhe = financeiro.emitir(
            c["cobranca"], c["unidade"], c["valorCentavos"], c["vencimento"]
        )
        return c["cobranca"], "emitida", detalhe
    if c["tipo"] == "pagar":
        return c["cobranca"], "paga", financeiro.pagar(c["cobranca"], c["em"])
    if c["tipo"] == "parcelar":
        return (
            c["cobranca"],
            "parcelada",
            financeiro.parcelar(c["cobranca"], c["parcelas"]),
        )
    try:
        detalhe = reservas.reservar(
            c["reserva"], c["unidade"], c["espaco"], c["data"], c["em"]
        )
        return c["reserva"], "confirmada", detalhe
    except RecusaErro as erro:
        return c["reserva"], "recusada", str(erro)


linhas = []
for c in dados["comandos"]:
    id, situacao, detalhe = executar(c)
    linhas.append(f"{id};{c['tipo']};{situacao};{detalhe}")
saida.mkdir(parents=True, exist_ok=True)
(saida / "resultados.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
print(f"{len(linhas)} comandos executados; saída em {saida}")
