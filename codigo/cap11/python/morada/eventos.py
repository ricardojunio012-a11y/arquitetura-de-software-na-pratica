# Evento de integração publicado pelo Financeiro. Carrega os dados de que os
# assinantes precisam (transferência de estado), para que não tenham de consultá-lo.


# O identificador do evento é estável: o mesmo pagamento gera sempre o mesmo evento
def evento_de(p: dict) -> dict:
    return {
        "evento": f"E-{p['pagamento']}",
        "tipo": "PagamentoConfirmado",
        "pagamento": p["pagamento"],
        "unidade": p["unidade"],
        "reserva": p["reserva"],
        "valorCentavos": p["valorCentavos"],
    }


def reais(centavos: int) -> str:
    inteiro = f"{centavos // 100:,}".replace(",", ".")
    return f"R$ {inteiro},{centavos % 100:02d}"
