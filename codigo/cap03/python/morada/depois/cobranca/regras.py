# Regras internas da cobrança, usadas só pelo próprio módulo.
from datetime import date

from morada.depois.compartilhado.datas import dias_entre
from morada.depois.compartilhado.dinheiro import percentual

_FUNDO_DE_RESERVA = 10  # % sobre a taxa
_MULTA = 2  # % sobre o débito


def fundo_de_reserva(taxa: int) -> int:
    return percentual(taxa, _FUNDO_DE_RESERVA)


def encargos(debito: int, vencimento: str, hoje: date) -> dict:
    dias = dias_entre(vencimento, hoje)
    juros = (debito * dias + 1500) // 3000  # 1% ao mês, proporcional
    return {"dias": dias, "multa": percentual(debito, _MULTA), "juros": juros}
