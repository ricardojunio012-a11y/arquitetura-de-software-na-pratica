# Adaptador: traduz a cobrança do Morada para a API do PagaFácil (Pix).
from morada.depois.cobranca.cobranca import Cobranca
from morada.depois.emissao.gateway import Prazos, Registro
from morada.externos.paga_facil import PagaFacilApi


class GatewayPagaFacil:
    nome = "PagaFácil"

    def __init__(self, api: PagaFacilApi):
        self._api = api

    def registrar(self, cobranca: Cobranca, prazos: Prazos) -> Registro:
        # txid único por mês e unidade: MORADA202603A101
        mes = prazos.vencimento[:7].replace("-", "")
        pedido = {
            "txid": "MORADA" + mes + cobranca.unidade.replace("-", ""),
            "valorCentavos": cobranca.total,
            "expiraEm": prazos.vencimento,
        }
        if cobranca.desconto > 0:
            pedido["descontoCentavos"] = cobranca.desconto
            pedido["descontoAte"] = prazos.desconto_ate
        resposta = self._api.criar_cobranca(pedido)
        return Registro(cobranca.unidade, f"pix {resposta['txid']}")
