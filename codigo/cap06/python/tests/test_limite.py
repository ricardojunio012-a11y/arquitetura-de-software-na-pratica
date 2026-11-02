# Os testes da classe-broto: a regra nova é testada sozinha, sem o código legado.
from morada.etapa6.limite import LimitePorMes

LIMITE = LimitePorMes()


def salao(unidade, data):
    return {"unidade": unidade, "espaco": "salao", "data": data}


def churrasco(data):
    return {"unidade": "A-101", "espaco": "churrasqueira", "data": data}


def test_recusa_a_segunda_reserva_do_salao_no_mesmo_mes():
    feitas = [salao("A-101", "2026-03-14")]
    assert LIMITE.atingido(salao("A-101", "2026-03-28"), feitas)


def test_nao_conta_outro_mes_outra_unidade_nem_outro_espaco():
    feitas = [salao("A-101", "2026-02-28"), salao("B-101", "2026-03-14")]
    feitas.append(churrasco("2026-03-07"))
    assert not LIMITE.atingido(salao("A-101", "2026-03-28"), feitas)


def test_churrasqueira_aceita_duas_e_espaco_sem_limite_aceita_todas():
    duas = [churrasco("2026-03-07"), churrasco("2026-03-14")]
    assert not LIMITE.atingido(churrasco("2026-03-21"), duas[:1])
    assert LIMITE.atingido(churrasco("2026-03-21"), duas)
    piscina = {"unidade": "A-101", "espaco": "piscina", "data": "2026-03-21"}
    assert not LIMITE.atingido(piscina, [piscina, piscina])
