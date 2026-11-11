# Conexão com o PostgreSQL e um esquema limpo para cada experimento.
import psycopg


def conectar(url: str) -> psycopg.Connection:
    # Sem transação automática: cada código abre e fecha as suas com BEGIN e COMMIT
    return psycopg.connect(url, autocommit=True)


def recriar_esquema(banco: psycopg.Connection) -> None:
    banco.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
