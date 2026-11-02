from morada.compartilhado.dinheiro import percentual
from morada.depois.cobranca.tipos import Lancamento


class MultaPorAtraso:
    """Multa única sobre o débito em atraso."""

    def __init__(self, porcento: int):
        self._porcento = porcento

    def aplicar(self, unidade, lancados):
        d = unidade["debitoAnterior"]
        if not d:
            return []
        multa = percentual(d["valorCentavos"], self._porcento)
        return [Lancamento("multa", f"Multa ({self._porcento}%)", multa)]
