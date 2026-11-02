# O banco do Financeiro: os pagamentos e, na versão com outbox, a tabela de eventos
# a publicar, gravada na mesma transação do pagamento.
import json
import os

import psycopg


def conectar_banco() -> psycopg.Connection:
    banco = psycopg.connect(os.environ["BANCO_URL"], autocommit=True)
    banco.execute("DROP TABLE IF EXISTS outbox, pagamentos")
    banco.execute("""CREATE TABLE pagamentos (
        id text PRIMARY KEY, unidade text, reserva text, valor_centavos integer)""")
    banco.execute("""CREATE TABLE outbox (
        id serial PRIMARY KEY, evento text UNIQUE, conteudo text,
        publicado boolean NOT NULL DEFAULT false)""")
    return banco


def gravar_pagamento(banco: psycopg.Connection, p: dict) -> None:
    banco.execute(
        "INSERT INTO pagamentos VALUES (%s, %s, %s, %s)",
        (p["pagamento"], p["unidade"], p["reserva"], p["valorCentavos"]),
    )


# Pagamento e evento na mesma transação: ou os dois ficam gravados, ou nenhum
def gravar_com_outbox(banco: psycopg.Connection, p: dict, e: dict) -> None:
    with banco.transaction():
        gravar_pagamento(banco, p)
        banco.execute(
            "INSERT INTO outbox (evento, conteudo) VALUES (%s, %s)",
            (e["evento"], json.dumps(e, ensure_ascii=False)),
        )
