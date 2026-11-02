# Aberta para extensão, fechada para modificação: uma regra nova é uma classe nova,
# entregue pelo construtor. Esta classe não muda.
from morada.depois.cobranca.cobranca import Cobranca
from morada.depois.cobranca.tipos import Lancamento, Regra


class CalculadoraDeCobranca:
    def __init__(self, regras: list[Regra]):
        self._regras = tuple(regras)

    def calcular(self, unidade: dict) -> Cobranca:
        lancados: list[Lancamento] = []
        for regra in self._regras:
            lancados += regra.aplicar(unidade, lancados)
        return Cobranca(unidade["id"], unidade["morador"]["nome"], tuple(lancados))
