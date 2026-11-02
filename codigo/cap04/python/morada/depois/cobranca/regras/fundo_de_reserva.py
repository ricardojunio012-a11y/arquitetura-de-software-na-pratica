from morada.compartilhado.dinheiro import percentual
from morada.depois.cobranca.tipos import Lancamento, valor_de


class FundoDeReserva:
    """Percentual sobre a taxa condominial, para o fundo de reserva."""

    def __init__(self, porcento: int):
        self._porcento = porcento

    def aplicar(self, unidade, lancados):
        fundo = percentual(valor_de(lancados, "taxa"), self._porcento)
        return [Lancamento("fundo", f"Fundo de reserva ({self._porcento}%)", fundo)]
