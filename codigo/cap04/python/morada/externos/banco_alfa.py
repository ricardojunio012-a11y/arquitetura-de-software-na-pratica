# Simula o SDK de um banco emissor de boletos. A API é do banco, não do Morada:
# valores em reais com ponto e datas no formato DD/MM/AAAA.


class ClienteBancoAlfa:
    # Boletos emitidos no "servidor" do banco (o teste da versão antes usa)
    emitidos = 0

    def emitir_boleto(self, pedido: dict) -> dict:
        if not pedido.get("pagador") or not pedido.get("valor"):
            raise ValueError("pedido incompleto")
        ClienteBancoAlfa.emitidos += 1
        return {"nossoNumero": f"{ClienteBancoAlfa.emitidos:07d}"}
