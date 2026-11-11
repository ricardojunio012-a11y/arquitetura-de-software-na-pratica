# O banco da API: condomínios, cobranças, pagamentos e chaves de idempotência. A
# chave primária da tabela de chaves, (administradora, chave), garante um único
# processamento por chave de cada cliente, mesmo com pedidos simultâneos.
import json
from pathlib import Path

import psycopg

TABELAS = """
    DROP TABLE IF EXISTS chaves_idempotencia, pagamentos, cobrancas, condominios;
    DROP SEQUENCE IF EXISTS pagamentos_seq;
    CREATE TABLE condominios (id text PRIMARY KEY, administradora text NOT NULL);
    CREATE TABLE cobrancas (
      id text PRIMARY KEY,
      condominio text NOT NULL REFERENCES condominios,
      unidade text NOT NULL,
      vencimento date NOT NULL,
      valor_centavos integer NOT NULL,
      situacao text NOT NULL
    );
    CREATE TABLE pagamentos (
      id text PRIMARY KEY,
      cobranca text NOT NULL UNIQUE REFERENCES cobrancas,
      valor_centavos integer NOT NULL
    );
    CREATE SEQUENCE pagamentos_seq;
    CREATE TABLE chaves_idempotencia (
      administradora text,
      chave text,
      pedido text NOT NULL,
      status integer,
      resposta text,
      PRIMARY KEY (administradora, chave)
    )"""


def ler_json(arquivo: Path):
    return json.loads(arquivo.read_text("utf-8"))


def preparar_banco(url: str, arquivo_cobrancas: str) -> None:
    with psycopg.connect(url, autocommit=True) as banco:
        banco.execute(TABELAS)
        # Quem administra cada condomínio fica em condominios.json, ao lado das
        # cobranças
        pasta = Path(arquivo_cobrancas).parent
        for c in ler_json(pasta / "condominios.json"):
            banco.execute(
                "INSERT INTO condominios VALUES (%s, %s)",
                [c["id"], c["administradora"]],
            )
        for c in ler_json(Path(arquivo_cobrancas)):
            banco.execute(
                "INSERT INTO cobrancas VALUES (%s, %s, %s, %s, %s, %s)",
                [
                    c["id"],
                    c["condominio"],
                    c["unidade"],
                    c["vencimento"],
                    c["valorCentavos"],
                    c["situacao"],
                ],
            )
