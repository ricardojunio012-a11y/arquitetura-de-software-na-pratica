# Testes da simulação da fila de registro: mesma semente, mesmo resultado.
from morada.fila_de_registro import disponiveis_ate, percentil, simular

PREMISSAS = {
    "id": "T",
    "descricao": "teste",
    "boletos": 1000,
    "boletosPorArquivo": 250,
    "registrosPorSegundo": 10,
    "retornoSegundos": 100,
    "falhaPassageiraPorCento": 20,
    "recusaDefinitivaACada": 50,
    "maxTentativas": 3,
    "limiteSegundos": 400,
    "semente": 7,
}


def test_ingenua_cauda_passa_do_limite_e_ha_boletos_sem_registro():
    r = simular(PREMISSAS, False)
    assert (r.arquivos, r.tentativas, r.sem_registro) == (12, 1246, 26)
    assert disponiveis_ate(r, 400) == 968
    assert percentil(r, 1000, 500) == 175
    assert percentil(r, 1000, 990) is None  # o p99 cai nos sem registro


def test_ajustada_tudo_disponivel_no_limite_parte_com_pix():
    r = simular(PREMISSAS, True)
    assert (r.arquivos, r.tentativas, r.via_pix) == (11, 1199, 32)
    assert disponiveis_ate(r, 400) == 1000
    assert percentil(r, 1000, 990) == 357


def test_mesma_semente_mesmo_resultado():
    assert simular(PREMISSAS, False) == simular(PREMISSAS, False)
