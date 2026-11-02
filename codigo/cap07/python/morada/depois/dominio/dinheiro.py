# Objeto de valor: imutável, comparado pelo valor e dono das próprias regras.
from dataclasses import dataclass

from morada.depois.dominio.erro import ErroDeDominio


@dataclass(frozen=True)
class Dinheiro:
    centavos: int

    def __post_init__(self):
        if not isinstance(self.centavos, int) or self.centavos < 0:
            raise ErroDeDominio(
                "valor em dinheiro deve ser um número inteiro de centavos"
            )

    def somar(self, outro: "Dinheiro") -> "Dinheiro":
        return Dinheiro(self.centavos + outro.centavos)

    def percentual(self, porcento: int) -> "Dinheiro":
        """Percentual com arredondamento meio para cima, sempre no mesmo lugar."""
        return Dinheiro((self.centavos * porcento + 50) // 100)

    def __str__(self) -> str:
        inteiro = f"{self.centavos // 100:,}".replace(",", ".")
        return f"R$ {inteiro},{self.centavos % 100:02d}"


ZERO = Dinheiro(0)
