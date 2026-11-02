# Testes: o que o modelo anêmico permite e o que o modelo rico impede.
import pytest

from morada.antes.modelo import Reserva as ReservaAnemica
from morada.antes.modelo import reservas
from morada.depois.dominio.agenda import Agenda, PoliticaDeUso
from morada.depois.dominio.dinheiro import Dinheiro
from morada.depois.dominio.erro import ErroDeDominio
from morada.depois.dominio.periodo import Periodo

POLITICA = PoliticaDeUso(Dinheiro(15000), 2, 1)


def test_antes_qualquer_codigo_pode_gravar_uma_reserva_sobreposta():
    reservas.append(
        ReservaAnemica("X-1", espaco="salao", data="2026-03-14", inicio=14, fim=22)
    )
    reservas.append(
        ReservaAnemica("X-2", espaco="salao", data="2026-03-14", inicio=20, fim=23)
    )
    sobrepostas = [r for r in reservas if r.id.startswith("X-")]
    assert len(sobrepostas) == 2  # o estado inválido foi aceito


def test_depois_a_agenda_recusa_um_horario_sobreposto():
    agenda = Agenda("salao", POLITICA)
    agenda.reservar("R-1", "A-101", Periodo("2026-03-14", 14, 22), "2026-03-02")
    with pytest.raises(ErroDeDominio, match="horário sobreposto a R-1"):
        agenda.reservar("R-2", "A-202", Periodo("2026-03-14", 20, 23), "2026-03-02")


def test_depois_nao_existe_periodo_com_o_fim_antes_do_inicio():
    with pytest.raises(ErroDeDominio):
        Periodo("2026-03-14", 18, 16)


def test_depois_dinheiro_arredonda_meio_para_cima_e_e_comparado_pelo_valor():
    assert str(Dinheiro(18001).percentual(50)) == "R$ 90,01"
    assert Dinheiro(9000) == Dinheiro(9000)


def test_depois_cancelar_em_cima_da_hora_gera_multa_e_evento():
    agenda = Agenda("salao", POLITICA)
    agenda.reservar("R-1", "A-101", Periodo("2026-03-14", 14, 22), "2026-03-02")
    agenda.recolher_eventos()
    assert str(agenda.cancelar("R-1", "2026-03-13")) == "R$ 90,00"
    assert [type(e).__name__ for e in agenda.recolher_eventos()] == ["ReservaCancelada"]
    with pytest.raises(ErroDeDominio, match="não está confirmada"):
        agenda.cancelar("R-1", "2026-03-13")
    with pytest.raises(ErroDeDominio, match="não encontrada"):
        agenda.cancelar("R-99", "2026-03-13")
