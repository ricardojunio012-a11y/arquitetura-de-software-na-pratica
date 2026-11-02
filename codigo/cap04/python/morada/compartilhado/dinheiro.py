# Valores em centavos e arredondamento meio para cima.


def parte_de(centavos: int, milionesimos: int) -> int:
    return (centavos * milionesimos + 500000) // 1000000


def percentual(centavos: int, porcento: int) -> int:
    return (centavos * porcento + 50) // 100


def reais(c: int) -> str:
    """1.352,18 (formato brasileiro, com sinal quando negativo)"""
    a = abs(c)
    inteiro = f"{a // 100:,}".replace(",", ".")
    return ("-" if c < 0 else "") + f"{inteiro},{a % 100:02d}"


def reais_com_ponto(c: int) -> str:
    """1352.18 (formato pedido pela API do Banco Alfa)"""
    return f"{c // 100}.{c % 100:02d}"
