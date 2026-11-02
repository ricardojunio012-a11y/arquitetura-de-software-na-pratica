# Testes do executor de cenários: verificam a carga e a avaliação, não o tempo.
from datetime import date

from morada.cenarios import avaliar, condominio_sintetico, executar


def test_gera_as_unidades_com_fracoes_que_somam_o_condominio():
    unidades = condominio_sintetico(1, 40)["unidades"]
    assert len(unidades) == 40
    assert sum(u["fracaoMilionesimos"] for u in unidades) == 1000000
    assert len([u for u in unidades if u["debitoAnterior"]]) == 5


def test_passa_dentro_do_limite_e_falha_acima():
    assert avaliar(59.9, 60)
    assert not avaliar(60.1, 60)


def test_estima_o_registro_pela_capacidade_do_banco():
    cenario = {
        "id": "T",
        "descricao": "teste",
        "condominios": 3,
        "unidadesPorCondominio": 10,
        "registrosPorSegundo": 10,
        "limiteSegundos": 2,
    }
    r = executar(cenario, date(2026, 3, 2))
    assert r.cobrancas == 30
    assert r.segundos_registro == 3
    assert not r.passou  # 3 s de registro não cabem em 2 s
