# Utilidades diversas: o que não coube em outro lugar (coesão por coincidência).
from datetime import date

from morada.antes.config.config import config


def reais(c):
    return f"{c // 100:,}".replace(",", ".") + "," + f"{c % 100:02d}"


# Depende, sem avisar, da data guardada na configuração global
def dias_de_atraso(vencimento):
    return (config.hoje - date.fromisoformat(vencimento)).days


def competencia():
    return f"{config.hoje.month:02d}/{config.hoje.year}"
