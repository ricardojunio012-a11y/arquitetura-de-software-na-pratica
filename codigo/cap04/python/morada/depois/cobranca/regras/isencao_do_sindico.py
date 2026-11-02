from morada.depois.cobranca.tipos import Lancamento, valor_de


class IsencaoDoSindico:
    """O síndico não paga a taxa condominial (o fundo de reserva continua)."""

    def aplicar(self, unidade, lancados):
        if not unidade.get("sindico"):
            return []
        return [
            Lancamento("isencao", "Isenção do síndico", -valor_de(lancados, "taxa"))
        ]
