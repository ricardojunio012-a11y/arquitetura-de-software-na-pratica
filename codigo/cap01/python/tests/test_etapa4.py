# Testes de unidade das três mudanças, feitas sobre o código refatorado.
from datetime import date

from morada.etapa4.aplicacao import gerar_cobranca_mensal
from morada.etapa4.calculo import calcular_cobranca
from morada.etapa4.pagamento import Boleto
from morada.etapa4.pix import Pix

HOJE = date(2026, 3, 2)


def unidade(**extra):
    return {
        "id": "A-101",
        "fracaoMilionesimos": 125000,
        "morador": {"nome": "Ana", "email": "ana@example.com", "canal": "email"},
        "meioPagamento": "boleto",
        "debitoAnterior": None,
        **extra,
    }


def test_da_desconto_de_pontualidade_para_quem_nao_tem_debito():
    assert calcular_cobranca(485000, unidade(), HOJE).total_ate_05 == 66688 - 3031


def test_nao_da_desconto_para_quem_tem_debito():
    u = unidade(debitoAnterior={"valorCentavos": 1000, "vencimento": "2026-02-10"})
    assert calcular_cobranca(485000, u, HOJE).total_ate_05 is None


def test_usa_pix_e_whatsapp_quando_a_unidade_pede():
    class NotificadorFalso:
        def __init__(self):
            self.codigos = []

        def notificar(self, aviso):
            self.codigos.append(aviso.codigo_de_pagamento)

    email, whatsapp = NotificadorFalso(), NotificadorFalso()
    dados = {
        "condominio": {
            "id": "teste",
            "nome": "Condomínio Teste",
            "despesasDoMesCentavos": 100000,
        },
        "unidades": [
            unidade(fracaoMilionesimos=500000),
            unidade(
                id="A-102",
                fracaoMilionesimos=500000,
                meioPagamento="pix",
                morador={
                    "nome": "Bia",
                    "email": "bia@example.com",
                    "telefone": "+5511900000000",
                    "canal": "whatsapp",
                },
            ),
        ],
    }
    gerar_cobranca_mensal(
        dados,
        HOJE,
        {"boleto": Boleto(), "pix": Pix()},
        {"email": email, "whatsapp": whatsapp},
    )
    assert email.codigos == ["BOL-teste-202603-A-101-55000"]
    assert whatsapp.codigos == ["PIX-teste-202603-A-102-55000"]
