from datetime import date

from morada.compartilhado.datas import dias_entre
from morada.depois.cobranca.tipos import Lancamento


class JurosPorAtraso:
    """Juros ao mês, proporcionais aos dias de atraso (mês de 30 dias)."""

    def __init__(self, porcento_ao_mes: int, hoje: date):
        self._porcento_ao_mes = porcento_ao_mes
        self._hoje = hoje

    def aplicar(self, unidade, lancados):
        d = unidade["debitoAnterior"]
        if not d:
            return []
        dias = dias_entre(d["vencimento"], self._hoje)
        juros = (d["valorCentavos"] * self._porcento_ao_mes * dias + 1500) // 3000
        return [Lancamento("juros", f"Juros ({dias} dias)", juros)]
