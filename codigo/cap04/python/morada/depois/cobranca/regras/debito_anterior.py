from morada.compartilhado.datas import dia_mes
from morada.depois.cobranca.tipos import Lancamento


class DebitoAnterior:
    """O valor que ficou em aberto no mês anterior."""

    def aplicar(self, unidade, lancados):
        d = unidade["debitoAnterior"]
        if not d:
            return []
        descricao = f"Débito anterior (venc. {dia_mes(d['vencimento'])})"
        return [Lancamento("debito", descricao, d["valorCentavos"])]
