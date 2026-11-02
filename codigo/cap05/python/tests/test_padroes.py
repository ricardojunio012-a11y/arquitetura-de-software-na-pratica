# Testes: cada padrão isolado, com dublês no lugar dos provedores.
from datetime import date

import pytest

from morada.aprovacao import AntecedenciaMinima, UnidadeEmDia
from morada.estado import Reserva
from morada.eventos import Barramento, Evento
from morada.notificacao import (
    ComRegistro,
    ComRetentativas,
    Email,
    FabricaDeCanais,
    Mensagem,
    ProvedorSimulado,
    Sms,
)
from morada.repositorio import RepositorioEmMemoria
from morada.tipos import Decisao, Espaco, Morador, Pedido, Unidade

MORADOR = Morador("Diego", "d@x.com", "sms", "+55")
PEDIDO = Pedido(
    "R-1",
    Unidade("A-1", False, MORADOR),
    Espaco("salao", "Salão", 15000, 2, 1),
    "2026-03-03",
)
MENSAGEM = Mensagem("Teste", "olá")


def test_decorator_retentativas_por_fora_e_registro_por_dentro():
    provedor = ProvedorSimulado({"+55": 2})
    registro, esperas = [], []
    canal = ComRetentativas(
        ComRegistro(Sms(provedor), registro), 3, lambda ms, quem: esperas.append(ms)
    )
    canal.enviar(MORADOR, MENSAGEM)
    assert registro == [
        "sms para Diego: falhou (provedor indisponível)",
        "sms para Diego: falhou (provedor indisponível)",
        "sms para Diego: entregue (Teste)",
    ]
    assert esperas == [100, 200]  # espera crescente


def test_decorator_falha_definitiva_nao_e_repetida():
    provedor = ProvedorSimulado({}, ["d@x.com"])
    registro = []
    canal = ComRetentativas(
        ComRegistro(Email(provedor), registro), 3, lambda ms, quem: None
    )
    with pytest.raises(RuntimeError, match="sem nova tentativa"):
        canal.enviar(MORADOR, MENSAGEM)
    assert len(registro) == 1


def test_state_a_reserva_aceita_so_as_transicoes_do_estado():
    reserva = Reserva(PEDIDO)
    reserva.aprovar()
    reserva.cancelar()
    assert reserva.estado == "cancelada"
    with pytest.raises(
        ValueError, match="não é possível aprovar uma reserva cancelada"
    ):
        reserva.aprovar()


def test_repository_salvar_se_livre_recusa_o_segundo_pedido():
    reservas = RepositorioEmMemoria()
    primeira = Reserva(PEDIDO)
    assert reservas.salvar_se_livre(primeira)
    primeira.aprovar()
    segunda = Pedido("R-2", PEDIDO.unidade, PEDIDO.espaco, PEDIDO.data)
    assert not reservas.salvar_se_livre(Reserva(segunda))


def test_factory_escolhe_pelo_canal_e_usa_email_se_nao_conhecer():
    fabrica = FabricaDeCanais(ProvedorSimulado({}), [], lambda ms, quem: None)
    assert fabrica.para(MORADOR).nome == "sms"
    pombo = Morador("Diego", "d@x.com", "pombo-correio", "+55")
    assert fabrica.para(pombo).nome == "email"


def test_chain_a_primeira_etapa_que_recusa_decide_o_motivo():
    cadeia = UnidadeEmDia()
    cadeia.depois(AntecedenciaMinima(date(2026, 3, 2)))
    em_debito = Pedido("R-1", Unidade("A-1", True, MORADOR), PEDIDO.espaco, PEDIDO.data)
    assert cadeia.avaliar(em_debito).motivo == "unidade com débito em aberto"
    assert cadeia.avaliar(PEDIDO).motivo == "antecedência mínima de 2 dias"
    depois = Pedido("R-1", PEDIDO.unidade, PEDIDO.espaco, "2026-03-10")
    assert cadeia.avaliar(depois) == Decisao(True)


def test_observer_um_assinante_que_falha_nao_impede_os_outros():
    eventos = Barramento()
    recebidos = []

    class Quebrado:
        nome = "Quebrado"

        def tratar(self, evento):
            raise RuntimeError("fora do ar")

    class Portaria:
        nome = "Portaria"

        def tratar(self, evento):
            recebidos.append(evento.pedido.id)

    eventos.assinar("ReservaConfirmada", Quebrado())
    eventos.assinar("ReservaConfirmada", Portaria())
    eventos.publicar(Evento("ReservaConfirmada", PEDIDO))
    assert recebidos == ["R-1"]
    assert eventos.falhas == ["ReservaConfirmada R-1: Quebrado: fora do ar"]
