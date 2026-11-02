# A cobrança de uma unidade. Especialista na informação (GRASP): quem tem os
# lançamentos é quem calcula os totais.
from dataclasses import dataclass

from morada.depois.cobranca.tipos import Lancamento


@dataclass(frozen=True)
class Cobranca:
    unidade: str
    morador: str
    lancamentos: tuple[Lancamento, ...]

    @property
    def total(self) -> int:
        return sum(l.valor for l in self.lancamentos if not l.condicional)

    @property
    def desconto(self) -> int:
        """Desconto condicional, em valor positivo"""
        return -sum(l.valor for l in self.lancamentos if l.condicional)
