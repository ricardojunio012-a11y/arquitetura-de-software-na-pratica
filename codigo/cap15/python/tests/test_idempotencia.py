# Testes de integração da idempotência contra o PostgreSQL: cinco pedidos simultâneos
# com a mesma chave resultam num único pagamento, e todos recebem a mesma resposta; a
# mesma chave em duas administradoras são dois pedidos diferentes.
import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import psycopg
import pytest

from morada.api.api import criar_api, subir
from morada.api.banco import preparar_banco

URL_BANCO = os.environ.get("BANCO_URL")


def pagar(url: str, administradora: str, cobranca: str, valor: int):
    corpo = json.dumps({"cobranca": cobranca, "valorCentavos": valor}).encode()
    cabecalhos = {
        "Content-Type": "application/json",
        "Morada-Administradora": administradora,
        "Idempotency-Key": "k-1",
    }
    requisicao = urllib.request.Request(
        f"{url}/v1/pagamentos", data=corpo, headers=cabecalhos, method="POST"
    )
    with urllib.request.urlopen(requisicao) as resposta:
        return resposta.status, json.loads(resposta.read())


def total_de_pagamentos() -> int:
    with psycopg.connect(URL_BANCO) as banco:
        (total,) = banco.execute("SELECT count(*) FROM pagamentos").fetchone()
    return total


@pytest.mark.skipif(not URL_BANCO, reason="sem banco")
def test_pedidos_simultaneos_com_a_mesma_chave_pagam_uma_vez_so():
    preparar_banco(URL_BANCO, "/dados/entrada/cobrancas.json")
    api = criar_api(URL_BANCO)
    url = subir(api)

    def pedido(_):
        return pagar(url, "ADM-A", "CB-04", 45000)

    with ThreadPoolExecutor(max_workers=5) as execucao:
        respostas = list(execucao.map(pedido, range(5)))
    api.shutdown()
    assert [status for status, _ in respostas] == [201] * 5
    assert len({corpo["id"] for _, corpo in respostas}) == 1
    assert total_de_pagamentos() == 1


@pytest.mark.skipif(not URL_BANCO, reason="sem banco")
def test_a_mesma_chave_em_duas_administradoras_nao_colide():
    preparar_banco(URL_BANCO, "/dados/entrada/cobrancas.json")
    api = criar_api(URL_BANCO)
    url = subir(api)
    status_a, corpo_a = pagar(url, "ADM-A", "CB-04", 45000)
    status_b, corpo_b = pagar(url, "ADM-B", "CB-05", 38000)
    api.shutdown()
    assert [status_a, status_b] == [201, 201]
    assert corpo_a["cobranca"] == "CB-04"
    assert corpo_b["cobranca"] == "CB-05"
    assert total_de_pagamentos() == 2
