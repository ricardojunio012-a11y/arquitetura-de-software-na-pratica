# Testes: cada módulo testado pela própria API, e Reservas testado sem o Financeiro.
import pytest

from morada.depois.modulos.financeiro.api import Financeiro
from morada.depois.modulos.financeiro.interno.tabela_de_cobrancas import (
    TabelaDeCobrancas,
)
from morada.depois.modulos.reservas.api import RecusaErro, Reservas


class SituacaoFixa:
    def __init__(self, em_dia: bool):
        self.em_dia = em_dia

    def unidade_em_dia(self, unidade, hoje):
        return self.em_dia


def test_parcelamento_deixa_a_unidade_em_dia():
    financeiro = Financeiro(TabelaDeCobrancas())
    financeiro.emitir("C-1", "B-101", 58685, "2026-02-10")
    assert not financeiro.unidade_em_dia("B-101", "2026-03-02")
    financeiro.parcelar("C-1", 3)
    assert financeiro.unidade_em_dia("B-101", "2026-03-02")


def test_recusa_unidade_em_debito_com_financeiro_de_mentira():
    reservas = Reservas(["salao"], SituacaoFixa(False))
    with pytest.raises(RecusaErro):
        reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02")


def test_nao_aceita_duas_reservas_do_mesmo_espaco_no_mesmo_dia():
    reservas = Reservas(["salao"], SituacaoFixa(True))
    reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02")
    with pytest.raises(RecusaErro, match="salao já reservado em 2026-03-14"):
        reservas.reservar("R-2", "A-2", "salao", "2026-03-14", "2026-03-02")
