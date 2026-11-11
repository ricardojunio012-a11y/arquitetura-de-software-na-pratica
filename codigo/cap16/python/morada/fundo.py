# O fundo de reserva: o saldo é a soma dos movimentos, e uma saída só pode ser
# registrada se houver saldo.
import psycopg


def preparar_fundo(banco: psycopg.Connection) -> None:
    banco.execute("TRUNCATE movimentos")
    banco.execute("INSERT INTO fundos VALUES (1, 1234) ON CONFLICT DO NOTHING")
    banco.execute(
        "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) "
        "VALUES (1, 100000, 'saldo inicial')"
    )


def saldo(banco: psycopg.Connection, fundo: int) -> int:
    (total,) = banco.execute(
        "SELECT coalesce(sum(valor_centavos), 0)::int FROM movimentos "
        "WHERE fundo_id = %s",
        [fundo],
    ).fetchone()
    return total


def inserir_saida(banco: psycopg.Connection, fundo: int, valor: int, descricao: str):
    banco.execute(
        "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) "
        "VALUES (%s, %s, %s)",
        [fundo, -valor, descricao],
    )


# A forma correta em READ COMMITTED: travar a linha do fundo antes de ler o saldo.
# Duas saídas do mesmo fundo passam a acontecer uma depois da outra.
def registrar_saida(
    banco: psycopg.Connection, fundo: int, valor: int, descricao: str
) -> bool:
    with banco.transaction():
        banco.execute("SELECT id FROM fundos WHERE id = %s FOR UPDATE", [fundo])
        if saldo(banco, fundo) < valor:
            return False
        inserir_saida(banco, fundo, valor, descricao)
        return True


# 123456 centavos → "1.234,56"
def reais(centavos: int) -> str:
    sinal = "-" if centavos < 0 else ""
    inteiro, resto = divmod(abs(centavos), 100)
    return f"{sinal}{inteiro:,}".replace(",", ".") + f",{resto:02d}"
