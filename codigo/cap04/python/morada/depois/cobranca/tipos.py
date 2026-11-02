# Os tipos de que a calculadora depende. Nenhum deles conhece uma regra concreta.
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Lancamento:
    """Item da cobrança. Condicional: só vale se pago até a data do desconto."""

    codigo: str
    descricao: str
    valor: int
    condicional: bool = False


class Regra(Protocol):
    """Cada regra olha a unidade e o que já foi lançado e devolve o que soma."""

    def aplicar(
        self, unidade: dict, lancados: list[Lancamento]
    ) -> list[Lancamento]: ...


def valor_de(lancados: list[Lancamento], codigo: str) -> int:
    return sum(l.valor for l in lancados if l.codigo == codigo)
