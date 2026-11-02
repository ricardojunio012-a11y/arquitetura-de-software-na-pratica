# Testes: o núcleo sem nenhum adaptador real, os adaptadores sem o núcleo real e o
# mesmo contrato verificado nos dois repositórios.
import os

import pytest

from morada.adaptadores.entrada.cli import executar
from morada.adaptadores.saida.em_memoria import AgendasEmMemoria
from morada.aplicacao.servico_de_reservas import ServicoDeReservas
from morada.dominio.agenda import Espaco, NaoEncontradoErro, RegraVioladaErro

SALAO = Espaco("salao", 15000, 2)
PEDIDO = {
    "reserva": "R-1",
    "unidade": "A-101",
    "espaco": "salao",
    "data": "2026-03-14",
    "inicio": 14,
    "fim": 22,
    "em": "2026-03-02",
}


def test_o_nucleo_reserva_e_recusa_sobreposicao_so_com_memoria():
    servico = ServicoDeReservas(AgendasEmMemoria([SALAO]))
    assert servico.reservar(PEDIDO)["taxa"] == "R$ 180,00"
    with pytest.raises(RegraVioladaErro, match="sobreposto a R-1"):
        servico.reservar({**PEDIDO, "reserva": "R-2"})


def test_o_adaptador_de_linha_de_comando_nao_precisa_do_nucleo_de_verdade():
    chamadas = []

    class Falso:
        def cancelar(self, reserva, em):
            chamadas.append(f"{reserva} {em}")
            return {"reserva": reserva, "multa": "R$ 0,00"}

    resultado = executar(Falso(), ["cancelar", "R-7", "2026-03-01"])
    assert chamadas == ["R-7 2026-03-01"]
    assert resultado == ("R-7 cancelada, multa R$ 0,00", 0)


def em_memoria():
    return AgendasEmMemoria([SALAO])


def no_postgres():
    import psycopg

    from morada.adaptadores.saida.postgres import AgendasNoPostgres

    banco = psycopg.connect(os.environ["BANCO_URL"], autocommit=True)
    agendas = AgendasNoPostgres(banco, [SALAO])
    agendas.preparar()
    return agendas


# No contêiner, o banco existe; fora dele, o caso do PostgreSQL é pulado
REPOSITORIOS = [
    em_memoria,
    pytest.param(
        no_postgres,
        marks=pytest.mark.skipif(not os.environ.get("BANCO_URL"), reason="sem banco"),
    ),
]


# O mesmo contrato vale para qualquer adaptador da porta de saída
@pytest.mark.parametrize("criar", REPOSITORIOS)
def test_contrato_guarda_a_agenda_e_a_encontra_pela_reserva(criar):
    agendas = criar()
    agenda = agendas.do_espaco("salao")
    agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02")
    agendas.salvar(agenda)
    assert [r.id for r in agendas.da_reserva("R-1").reservas()] == ["R-1"]


@pytest.mark.parametrize("criar", REPOSITORIOS)
def test_contrato_avisa_quando_a_reserva_nao_existe(criar):
    with pytest.raises(NaoEncontradoErro):
        criar().da_reserva("R-9")
