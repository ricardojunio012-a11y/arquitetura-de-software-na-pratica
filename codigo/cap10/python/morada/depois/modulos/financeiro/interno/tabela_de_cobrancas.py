# A tabela do Financeiro: dado privado do módulo. Nenhum outro módulo deve lê-la.
from dataclasses import dataclass, field


@dataclass
class LinhaDeCobranca:
    cobranca: str
    unidade: str
    valor_centavos: int
    vencimento: str
    situacao: str = "aberta"
    parcelas: int = 1


@dataclass
class TabelaDeCobrancas:
    linhas: list[LinhaDeCobranca] = field(default_factory=list)

    def buscar(self, cobranca: str) -> LinhaDeCobranca:
        for linha in self.linhas:
            if linha.cobranca == cobranca:
                return linha
        raise LookupError(f"cobrança {cobranca} não encontrada")
