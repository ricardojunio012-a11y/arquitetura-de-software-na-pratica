# O relatório de inadimplentes do síndico, com o defeito que o capítulo usa para
# mostrar o vazamento: a consulta esqueceu o filtro de condomínio.
import psycopg


def inadimplentes(banco: psycopg.Connection) -> list[tuple]:
    return banco.execute("""SELECT condominio_id, unidade, morador, valor_centavos
           FROM cobrancas
           WHERE situacao = 'aberta' -- falta: AND condominio_id = %s
           ORDER BY condominio_id, unidade""").fetchall()
