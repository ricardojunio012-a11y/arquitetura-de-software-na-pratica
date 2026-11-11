# As migrações rodam uma vez cada, em ordem, e uma segunda execução não faz nada.
import os

import pytest

from morada.banco import conectar, recriar_esquema
from morada.migracoes import aplicar_migracoes

URL = os.environ.get("BANCO_URL")


@pytest.mark.skipif(not URL, reason="sem banco")
def test_aplicam_cada_arquivo_uma_unica_vez_em_ordem():
    with conectar(URL) as banco:
        recriar_esquema(banco)
        assert aplicar_migracoes(banco, "/dados/migracoes") == [
            "001_cobrancas.sql",
            "002_fundo_de_reserva.sql",
            "003_indice_inadimplencia.sql",
        ]
        assert aplicar_migracoes(banco, "/dados/migracoes") == []
