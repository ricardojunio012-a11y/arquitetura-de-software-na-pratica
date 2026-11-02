from morada.compartilhado.dinheiro import parte_de
from morada.depois.cobranca.tipos import Lancamento


class TaxaCondominial:
    """A parte da unidade nas despesas do mês, pela fração ideal."""

    def __init__(self, despesas_do_mes: int):
        self._despesas = despesas_do_mes

    def aplicar(self, unidade, lancados):
        taxa = parte_de(self._despesas, unidade["fracaoMilionesimos"])
        return [Lancamento("taxa", "Taxa condominial", taxa)]
