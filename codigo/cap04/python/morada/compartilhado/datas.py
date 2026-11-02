# Datas no formato ISO (AAAA-MM-DD) e "hoje" recebido por parâmetro.
from datetime import date


def dias_entre(data_iso: str, hoje: date) -> int:
    return (hoje - date.fromisoformat(data_iso)).days


def data_do_mes(hoje: date, dia: int) -> str:
    return hoje.replace(day=dia).isoformat()


def rotulo_do_mes(hoje: date) -> str:
    return f"{hoje.month:02d}/{hoje.year}"


def dia_mes(data_iso: str) -> str:
    """2026-03-10 -> 10/03"""
    return f"{data_iso[8:10]}/{data_iso[5:7]}"


def data_br(data_iso: str) -> str:
    """2026-03-10 -> 10/03/2026"""
    return f"{dia_mes(data_iso)}/{data_iso[:4]}"
