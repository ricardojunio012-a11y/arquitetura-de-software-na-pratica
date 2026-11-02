# Como o morador paga. O cálculo não sabe que meio é esse.
from typing import Protocol

from morada.cobranca.calculo import Cobranca
from morada.cobranca.competencia import Competencia


class MeioDePagamento(Protocol):
    nome: str

    def gerar_codigo(
        self, condominio_id: str, competencia: Competencia, cobranca: Cobranca
    ) -> str: ...


# Código fictício: num sistema real, viria do banco emissor
class Boleto:
    nome = "Boleto"

    def gerar_codigo(
        self, condominio_id: str, competencia: Competencia, cobranca: Cobranca
    ) -> str:
        unidade = cobranca.unidade["id"]
        return f"BOL-{condominio_id}-{competencia.codigo}-{unidade}-{cobranca.total}"
