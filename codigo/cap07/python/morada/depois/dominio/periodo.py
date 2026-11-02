# Objeto de valor: um período de uso num dia. O fim nunca vem antes do início.
from dataclasses import dataclass
from datetime import date

from morada.depois.dominio.erro import ErroDeDominio


@dataclass(frozen=True)
class Periodo:
    data: str
    inicio: int
    fim: int

    def __post_init__(self):
        if self.fim <= self.inicio:
            raise ErroDeDominio("período inválido: o fim deve ser depois do início")

    def sobrepoe(self, outro: "Periodo") -> bool:
        return (
            self.data == outro.data
            and self.inicio < outro.fim
            and outro.inicio < self.fim
        )

    def mes(self) -> str:
        return self.data[:7]

    def dias_desde(self, dia: str) -> int:
        return (date.fromisoformat(self.data) - date.fromisoformat(dia)).days

    def eh_fim_de_semana(self) -> bool:
        return date.fromisoformat(self.data).weekday() >= 5

    def __str__(self) -> str:
        return f"{self.data} {self.inicio}h-{self.fim}h"
