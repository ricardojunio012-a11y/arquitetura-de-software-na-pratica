# Testes de caracterização: descrevem o que o código faz hoje, inclusive o que
# talvez esteja errado. Mudar o comportamento é outro passo, com outro commit.
import json
import os
from datetime import date
from pathlib import Path

from morada.etapa5.reservas import avisos, decidir, motivo_da_recusa, relatorio
from morada.etapa5.reservas import valor_da_reserva

HOJE = date(2026, 3, 2)
SALAO = {"id": "salao", "nome": "Salão", "taxa": 15000}


def ler(pasta, arquivo):
    # Entrada e resultado aprovado: /dados no contêiner; fora dele, o capítulo
    base = Path(f"/dados/{pasta}")
    if not base.exists():
        base = Path(__file__).parents[2] / pasta
    return (base / arquivo).read_text(encoding="utf-8")


def test_a_saida_e_identica_ao_resultado_aprovado():
    decisoes = decidir(json.loads(ler("entrada", "reservas.json")), HOJE)
    emails = [f"para {para}: {texto}" for para, texto in avisos(decisoes)]
    assert "\n".join(relatorio(decisoes)) + "\n" == ler("esperado", "reservas.txt")
    assert "\n".join(emails) + "\n" == ler("esperado", "emails.txt")


def test_domingo_nao_tem_acrescimo_de_fim_de_semana_comportamento_atual():
    domingo = {"id": "R", "unidade": "A", "espaco": "salao", "data": "2026-03-15"}
    domingo["convidados"] = 1
    assert valor_da_reserva(SALAO, domingo) == 15000
    assert valor_da_reserva(SALAO, {**domingo, "data": "2026-03-14"}) == 18000


def test_a_primeira_regra_que_falha_decide_o_motivo():
    pedido = {"id": "R", "unidade": "A", "espaco": "salao", "data": "2026-03-03"}
    em_debito = {"id": "A", "email": "a@x.com", "emDebito": True}
    assert motivo_da_recusa(pedido, em_debito, HOJE, []) == "débito"
    em_dia = {**em_debito, "emDebito": False}
    assert motivo_da_recusa(pedido, em_dia, HOJE, []) == "antecedência"
