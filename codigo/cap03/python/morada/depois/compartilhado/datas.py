# Datas recebidas por parâmetro: nada de relógio escondido.
from datetime import date


def dias_entre(data_iso: str, hoje: date) -> int:
    return (hoje - date.fromisoformat(data_iso)).days


def rotulo_do_mes(hoje: date) -> str:
    return f"{hoje.month:02d}/{hoje.year}"
