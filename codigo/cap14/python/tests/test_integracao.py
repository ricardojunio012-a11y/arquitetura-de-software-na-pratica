# Testes de integração: o repositório contra um PostgreSQL real, em contêiner.
import os

import psycopg
import pytest

from morada.comunicacao.postgres import AvisosNoPostgres

pytestmark = pytest.mark.skipif(not os.environ.get("BANCO_URL"), reason="sem banco")


def test_grava_um_aviso_e_o_encontra_depois():
    avisos = AvisosNoPostgres.conectar(os.environ["BANCO_URL"])
    assert not avisos.ja_enviado("E-1")
    avisos.registrar("E-1", "pagamento recebido")
    assert avisos.ja_enviado("E-1")
    avisos.fechar()


def test_o_banco_recusa_o_mesmo_aviso_duas_vezes():
    avisos = AvisosNoPostgres.conectar(os.environ["BANCO_URL"])
    avisos.registrar("E-1", "pagamento recebido")
    with pytest.raises(psycopg.errors.UniqueViolation):
        avisos.registrar("E-1", "pagamento recebido")
    avisos.fechar()
