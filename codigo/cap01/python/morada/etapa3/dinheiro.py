# Valores sempre em centavos (inteiros), para não perder precisão.
# Arredondamento: meio centavo para cima.


def parte_de(centavos: int, milionesimos: int) -> int:
    return (centavos * milionesimos + 500000) // 1000000


def percentual(centavos: int, porcento: int) -> int:
    return (centavos * porcento + 50) // 100


# 123456 -> "1.234,56"
def reais(centavos: int) -> str:
    return f"{centavos // 100:,}".replace(",", ".") + "," + f"{centavos % 100:02d}"
