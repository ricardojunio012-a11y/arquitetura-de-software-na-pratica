from morada.compartilhado.datas import dia_mes
from morada.compartilhado.dinheiro import percentual
from morada.depois.cobranca.tipos import Lancamento, valor_de


class DescontoAntecipado:
    """Desconto sobre a taxa devida para quem pagar até o dia combinado.
    Quem tem débito anterior não tem desconto (a regra do capítulo 1)."""

    def __init__(self, porcento: int, ate: str):
        self._porcento = porcento
        self._ate = ate

    def aplicar(self, unidade, lancados):
        taxa_devida = valor_de(lancados, "taxa") + valor_de(lancados, "isencao")
        if taxa_devida <= 0 or valor_de(lancados, "debito") > 0:
            return []
        descricao = f"Desconto até {dia_mes(self._ate)} ({self._porcento}%)"
        desconto = percentual(taxa_devida, self._porcento)
        return [Lancamento("desconto", descricao, -desconto, condicional=True)]
