# Os dados das reservas e funções pequenas de datas e dinheiro.
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Espaco:
    id: str
    nome: str
    taxaCentavos: int
    antecedenciaMinimaDias: int
    limitePorMes: int


@dataclass(frozen=True)
class Morador:
    nome: str
    email: str
    canal: str
    telefone: str | None = None


@dataclass(frozen=True)
class Unidade:
    id: str
    emDebito: bool
    morador: Morador


@dataclass(frozen=True)
class Pedido:
    id: str
    unidade: Unidade
    espaco: Espaco
    data: str


@dataclass(frozen=True)
class Decisao:
    aprovada: bool
    motivo: str | None = None


def dias_entre(hoje: date, data_iso: str) -> int:
    return (date.fromisoformat(data_iso) - hoje).days


def data_br(data_iso: str) -> str:
    """2026-03-14 -> 14/03/2026"""
    return "/".join(reversed(data_iso.split("-")))


def reais(c: int) -> str:
    return f"{c // 100},{c % 100:02d}"
