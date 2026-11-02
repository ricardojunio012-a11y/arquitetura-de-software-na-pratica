# Testes: a tela inicial numa chamada, o lote idempotente e o conflito detectado.
from morada.backend import Portaria, Reservas
from morada.bff import BffPorteiro

ENTREGAR = {
    "id": "op-A1",
    "tipo": "entregar",
    "encomenda": "E-1",
    "versaoVista": 1,
    "hora": "09:00",
}


def montar():
    return BffPorteiro(
        Portaria([{"encomenda": "E-1", "unidade": "A-1"}]),
        Reservas([{"reserva": "R-1", "espaco": "salao", "nomes": ["Ana"]}]),
    )


def test_monta_a_tela_inicial_numa_chamada():
    tela = montar().inicio()
    assert tela["encomendasPendentes"] == [
        {"encomenda": "E-1", "unidade": "A-1", "versao": 1}
    ]
    assert [v["nome"] for v in tela["visitantesEsperados"]] == ["Ana"]


def test_nao_confunde_visitante_com_outro_cujo_nome_contem_o_dele():
    bff = BffPorteiro(
        Portaria([]),
        Reservas(
            [{"reserva": "R-1", "espaco": "salao", "nomes": ["Ana", "Maria Ana"]}]
        ),
    )
    visita = {"id": "op-A1", "tipo": "registrarVisitante", "nome": "Maria Ana"}
    bff.sincronizar("A", [{**visita, "reserva": "R-1", "hora": "09:00"}])
    assert [v["nome"] for v in bff.inicio()["visitantesEsperados"]] == ["Ana"]


def test_com_resultados_persistidos_reconhece_o_lote_depois_de_reiniciar():
    portaria = Portaria([{"encomenda": "E-1", "unidade": "A-1"}])
    reservas = Reservas([])
    tabela: dict[str, str] = {}
    BffPorteiro(portaria, reservas, tabela).sincronizar("A", [ENTREGAR])
    depois = BffPorteiro(portaria, reservas, tabela)
    [(_, resultado)] = depois.sincronizar("A", [ENTREGAR])
    assert resultado == "aplicada"
    assert depois.repetidas == 1


def test_nao_aplica_duas_vezes_um_lote_reenviado():
    bff = montar()
    bff.sincronizar("A", [ENTREGAR])
    [(_, resultado)] = bff.sincronizar("A", [ENTREGAR])
    assert resultado == "aplicada"
    assert bff.repetidas == 1


def test_acusa_conflito_quando_a_encomenda_mudou():
    bff = montar()
    bff.sincronizar("B", [{**ENTREGAR, "id": "op-B1", "tipo": "devolver"}])
    [(_, resultado)] = bff.sincronizar("A", [ENTREGAR])
    assert resultado == "conflito: E-1 já devolvida pelo tablet B às 09:00"
