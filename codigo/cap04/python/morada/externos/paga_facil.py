# Simula a API de um provedor de Pix. Outra empresa, outro formato: valores em
# centavos, datas ISO e um identificador (txid) escolhido por quem cria a cobrança.


class PagaFacilApi:
    def criar_cobranca(self, cobranca: dict) -> dict:
        if cobranca["valorCentavos"] <= 0:
            raise ValueError("valor inválido")
        return {"txid": cobranca["txid"], "status": "ATIVA"}
