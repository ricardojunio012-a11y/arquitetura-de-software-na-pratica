# Eventos de domínio: fatos que já aconteceram, com o vocabulário do negócio.
from dataclasses import dataclass

from morada.depois.dominio.dinheiro import Dinheiro
from morada.depois.dominio.periodo import Periodo


@dataclass(frozen=True)
class ReservaConfirmada:
    reserva: str
    espaco: str
    periodo: Periodo
    unidade: str
    taxa: Dinheiro


@dataclass(frozen=True)
class ReservaCancelada:
    reserva: str
    multa: Dinheiro
