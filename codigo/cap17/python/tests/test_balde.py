# O balde de fichas: deixa passar a rajada, recusa o excesso e se recompõe com o tempo.
from morada.balde import BaldeDeFichas


def test_permite_a_rajada_recusa_o_excesso_e_ganha_fichas_com_o_tempo():
    balde = BaldeDeFichas(10, 20)
    assert all(balde.permite(0) for _ in range(10))
    assert not balde.permite(0)
    # 20 fichas por segundo: uma ficha a cada 50 ms
    assert not balde.permite(49)
    assert balde.permite(99)
