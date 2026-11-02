# Valores em centavos e arredondamento meio para cima. Não depende de nenhum módulo.


def parte_de(centavos: int, milionesimos: int) -> int:
    return (centavos * milionesimos + 500000) // 1000000


def percentual(centavos: int, porcento: int) -> int:
    return (centavos * porcento + 50) // 100


def reais(c: int) -> str:
    return f"{c // 100:,}".replace(",", ".") + "," + f"{c % 100:02d}"
