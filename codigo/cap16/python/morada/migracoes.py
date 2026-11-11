# Migrações versionadas: cada arquivo de migracoes/ roda uma única vez, em ordem, e
# fica registrado na tabela migracoes_aplicadas. Um arquivo que começa com
# "-- sem transação" roda fora de transação (CREATE INDEX CONCURRENTLY exige isso).
import math
from pathlib import Path

import psycopg


def aplicar_migracoes(
    banco: psycopg.Connection, pasta: str, ate: float = math.inf
) -> list[str]:
    banco.execute("""CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
             versao text PRIMARY KEY,
             aplicada_em timestamptz NOT NULL DEFAULT now()
           )""")
    feitas = {v for (v,) in banco.execute("SELECT versao FROM migracoes_aplicadas")}
    aplicadas = []
    registrar = "INSERT INTO migracoes_aplicadas (versao) VALUES (%s)"
    for arquivo in sorted(p.name for p in Path(pasta).glob("*.sql")):
        if int(arquivo.split("_")[0]) > ate:
            break
        if arquivo in feitas:
            continue
        sql = (Path(pasta) / arquivo).read_text(encoding="utf-8")
        if sql.startswith("-- sem transação"):
            banco.execute(sql)
            banco.execute(registrar, [arquivo])
        else:
            # A migração e o seu registro entram juntos, ou nenhum dos dois
            with banco.transaction():
                banco.execute(sql)
                banco.execute(registrar, [arquivo])
        aplicadas.append(arquivo)
    return aplicadas
