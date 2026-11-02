# Testes de unidade da etapa 3: possíveis porque o cálculo foi separado do resto.
from datetime import date

from morada.etapa3.aplicacao import gerar_cobranca_mensal
from morada.etapa3.calculo import calcular_cobranca
from morada.etapa3.pagamento import Boleto

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


def test_divide_as_despesas_pela_fracao_e_soma_fundo_de_reserva():
    c = calcular_cobranca(485000, unidade(), HOJE)
    assert (c.taxa, c.fundo, c.total) == (60625, 6063, 66688)


def test_cobra_multa_e_juros_proporcionais_aos_dias_de_atraso():
    c = calcular_cobranca(
        485000,
        unidade(debitoAnterior={"valorCentavos": 66750, "vencimento": "2026-02-10"}),
        HOJE,
    )
    assert c.multa == 1335
    assert c.juros == 445  # 20 dias
    assert c.total == 66688 + 66750 + 1335 + 445


def test_avisa_cada_morador_uma_vez_sem_enviar_nada():
    class NotificadorFalso:
        def __init__(self):
            self.avisos = []

        def notificar(self, aviso):
            self.avisos.append(aviso)

    notificador = NotificadorFalso()
    dados = {
        "condominio": {
            "id": "teste",
            "nome": "Condomínio Teste",
            "despesasDoMesCentavos": 100000,
        },
        "unidades": [
            unidade(fracaoMilionesimos=500000),
            unidade(id="A-102", fracaoMilionesimos=500000),
        ],
    }
    gerar_cobranca_mensal(dados, HOJE, Boleto(), notificador)
    assert [a.cobranca.unidade["id"] for a in notificador.avisos] == ["A-101", "A-102"]
    assert notificador.avisos[0].codigo_de_pagamento == "BOL-teste-202603-A-101-55000"
