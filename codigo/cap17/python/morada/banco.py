# Conexão com o PostgreSQL e transações em nome de um condomínio ou de uma
# administradora.
import psycopg


def conectar(url: str) -> psycopg.Connection:
    return psycopg.connect(url, autocommit=True)


# Executa uma função numa transação em nome de quem pede. O "true" do set_config
# faz o valor valer só nesta transação: numa conexão reaproveitada de um pool, o
# condomínio do pedido anterior não sobra para o próximo.
def _em_nome_de(
    banco: psycopg.Connection, configuracao: str, valor: int | None, funcao
):
    with banco.transaction():
        if valor is not None:
            banco.execute("SELECT set_config(%s, %s, true)", [configuracao, str(valor)])
        return funcao()


# O síndico age em nome de um condomínio. A administradora age em nome de todos os
# que administra, que a política do banco busca na tabela administracoes.
def como_condominio(banco: psycopg.Connection, condominio: int | None, funcao):
    return _em_nome_de(banco, "app.condominio", condominio, funcao)


def como_administradora(banco: psycopg.Connection, administradora: int, funcao):
    return _em_nome_de(banco, "app.administradora", administradora, funcao)
