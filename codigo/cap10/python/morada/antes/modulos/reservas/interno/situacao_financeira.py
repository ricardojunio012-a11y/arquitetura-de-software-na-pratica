# Antes: o atalho. Reservas lê a tabela do Financeiro direto e reimplementa a regra
# de inadimplência por conta própria, sem saber que um acordo de parcelamento
# deixa a unidade em dia.
from morada.antes.modulos.financeiro.interno.tabela_de_cobrancas import (
    TabelaDeCobrancas,
)


class SituacaoPelaTabela:
    def __init__(self, tabela: TabelaDeCobrancas):
        self._tabela = tabela

    def unidade_em_dia(self, unidade: str, hoje: str) -> bool:
        return not any(
            l.unidade == unidade and l.situacao != "paga" and l.vencimento < hoje
            for l in self._tabela.linhas
        )
