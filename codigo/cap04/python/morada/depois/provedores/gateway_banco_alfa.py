# Adaptador: traduz a cobrança do Morada para a API do Banco Alfa (boleto).
from morada.compartilhado.datas import data_br
from morada.compartilhado.dinheiro import reais_com_ponto
from morada.depois.cobranca.cobranca import Cobranca
from morada.depois.emissao.gateway import Prazos, Registro
from morada.externos.banco_alfa import ClienteBancoAlfa


class GatewayBancoAlfa:
    nome = "Banco Alfa"

    def __init__(self, cliente: ClienteBancoAlfa):
        self._cliente = cliente

    def registrar(self, cobranca: Cobranca, prazos: Prazos) -> Registro:
        pedido = {
            "pagador": cobranca.morador,
            "valor": reais_com_ponto(cobranca.total),
            "vencimento": data_br(prazos.vencimento),
        }
        if cobranca.desconto > 0:
            pedido["desconto"] = {
                "valor": reais_com_ponto(cobranca.desconto),
                "ate": data_br(prazos.desconto_ate),
            }
        resposta = self._cliente.emitir_boleto(pedido)
        return Registro(cobranca.unidade, f"boleto {resposta['nossoNumero']}")
