# Teste de ponta a ponta: o cliente do monólito, a API real e o PostgreSQL juntos.
# Poucos, lentos e valiosos: provam que as peças foram ligadas corretamente.
import os

import pytest

from morada.comunicacao.api import criar_api, subir
from morada.comunicacao.dominio import Comunicacao
from morada.comunicacao.postgres import AvisosNoPostgres
from morada.monolito.cliente import ClienteComunicacao


@pytest.mark.skipif(not os.environ.get("BANCO_URL"), reason="sem banco")
def test_envia_o_aviso_uma_vez_e_reconhece_o_reenvio():
    avisos = AvisosNoPostgres.conectar(os.environ["BANCO_URL"])
    api = criar_api(Comunicacao(avisos))
    cliente = ClienteComunicacao(subir(api))
    assert cliente.avisar("E-1", "pagamento recebido") == {
        "ok": True,
        "repetido": False,
    }
    assert cliente.avisar("E-1", "pagamento recebido") == {"ok": True, "repetido": True}
    api.shutdown()
    avisos.fechar()
