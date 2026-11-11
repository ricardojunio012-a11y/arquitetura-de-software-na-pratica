# Row-Level Security no PostgreSQL: uma consulta sem filtro só enxerga o condomínio
# da transação, e gravar no condomínio de outro é recusado. A administradora
# enxerga os condomínios que administra, e só eles.
import os
from pathlib import Path

import psycopg
import pytest

from morada.banco import como_administradora, como_condominio, conectar

URL = os.environ.get("BANCO_URL")


@pytest.mark.skipif(not URL, reason="sem banco")
def test_isola_leitura_e_escrita_por_condominio():
    with conectar(URL) as admin:
        admin.execute(Path("/dados/sql/esquema.sql").read_text(encoding="utf-8"))
        admin.execute(Path("/dados/sql/rls.sql").read_text(encoding="utf-8"))
    with conectar(os.environ["APP_BANCO_URL"]) as app:
        consulta = "SELECT DISTINCT condominio_id FROM cobrancas"
        linhas = como_condominio(app, 15, lambda: app.execute(consulta).fetchall())
        assert linhas == [(15,)]
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            como_condominio(
                app,
                15,
                lambda: app.execute(
                    "INSERT INTO cobrancas "
                    "(condominio_id, unidade, morador, valor_centavos, situacao) "
                    "VALUES (20, 'B-1', 'Íris Melo', 61000, 'aberta')"
                ),
            )


@pytest.mark.skipif(not URL, reason="sem banco")
def test_a_administradora_ve_os_condominios_que_administra_e_so_eles():
    with conectar(URL) as admin:
        admin.execute(Path("/dados/sql/esquema.sql").read_text(encoding="utf-8"))
        admin.execute(Path("/dados/sql/rls.sql").read_text(encoding="utf-8"))
    with conectar(os.environ["APP_BANCO_URL"]) as app:
        consulta = "SELECT DISTINCT condominio_id FROM cobrancas ORDER BY 1"
        linhas = como_administradora(app, 3, lambda: app.execute(consulta).fetchall())
        assert linhas == [(12,), (15,)]
