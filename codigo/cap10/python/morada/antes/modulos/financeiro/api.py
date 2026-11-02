# API pública do Financeiro: a única porta que os outros módulos podem usar.
from morada.antes.modulos.financeiro.interno.tabela_de_cobrancas import (
    LinhaDeCobranca,
    TabelaDeCobrancas,
)


def reais(centavos: int) -> str:
    inteiro = f"{centavos // 100:,}".replace(",", ".")
    return f"R$ {inteiro},{centavos % 100:02d}"


class Financeiro:
    def __init__(self, tabela: TabelaDeCobrancas):
        self._tabela = tabela

    def emitir(self, cobranca, unidade, valor_centavos, vencimento) -> str:
        linha = LinhaDeCobranca(cobranca, unidade, valor_centavos, vencimento)
        self._tabela.linhas.append(linha)
        return f"{unidade} {reais(valor_centavos)} vence {vencimento}"

    def pagar(self, cobranca: str, em: str) -> str:
        self._tabela.buscar(cobranca).situacao = "paga"
        return f"em {em}"

    def parcelar(self, cobranca: str, parcelas: int) -> str:
        linha = self._tabela.buscar(cobranca)
        linha.situacao = "parcelada"
        linha.parcelas = parcelas
        return f"{parcelas} parcelas"

    # Regra de inadimplência: cobrança parcelada num acordo não é débito
    def unidade_em_dia(self, unidade: str, hoje: str) -> bool:
        return not any(
            l.unidade == unidade and l.situacao == "aberta" and l.vencimento < hoje
            for l in self._tabela.linhas
        )
