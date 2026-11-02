# Testes: cada camada pode ser testada sem as de cima; o núcleo, sem plugins reais.
import pytest
from fastapi.testclient import TestClient

from morada.camadas.aplicacao import ServicoDeReservas
from morada.camadas.apresentacao import criar_api
from morada.camadas.dados import RepositorioDeAgendas
from morada.camadas.dominio import Agenda, Espaco, RegraVioladaErro
from morada.plugins.nucleo import Cobranca, Nucleo

SALAO = Espaco("salao", 15000, 2)


def test_o_dominio_recusa_horario_sobreposto_sem_saber_que_existe_http():
    agenda = Agenda(SALAO)
    agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02")
    with pytest.raises(RegraVioladaErro):
        agenda.reservar("R-2", "A-202", "2026-03-14", 20, 23, "2026-03-02")


def test_a_apresentacao_traduz_a_regra_violada_em_409():
    api = TestClient(criar_api(ServicoDeReservas(RepositorioDeAgendas([SALAO]))))
    corpo = {
        "reserva": "R-1",
        "unidade": "A-101",
        "espaco": "salao",
        "data": "2026-03-03",
        "inicio": 10,
        "fim": 12,
        "em": "2026-03-02",
    }
    assert api.post("/reservas", json=corpo).status_code == 409


class PluginDeTeste:
    def __init__(self, nome, registrar):
        self.nome = nome
        self.registrar = registrar


def test_emite_pelo_plugin_instalado_e_avisa_quando_falta_plugin():
    nucleo = Nucleo()
    nucleo.instalar(PluginDeTeste("teste", lambda c: f"T-{c.unidade}"))
    assert nucleo.emitir(Cobranca("A-1", 100, "teste")) == "A-1;R$ 1,00;teste;T-A-1"
    assert (
        nucleo.emitir(Cobranca("A-1", 100, "zeta"))
        == "A-1;R$ 1,00;zeta;sem plugin para o banco zeta"
    )


def test_um_plugin_com_defeito_nao_derruba_o_nucleo():
    def quebrado(_c):
        raise RuntimeError("fora do ar")

    nucleo = Nucleo()
    nucleo.instalar(PluginDeTeste("quebrado", quebrado))
    assert (
        nucleo.emitir(Cobranca("A-1", 100, "quebrado"))
        == "A-1;R$ 1,00;quebrado;falha no plugin quebrado: fora do ar"
    )


def test_recusa_um_plugin_que_nao_cumpre_o_contrato():
    with pytest.raises(TypeError, match="contrato"):
        Nucleo().instalar(object())
