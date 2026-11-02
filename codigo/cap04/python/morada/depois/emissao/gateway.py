# A abstração pertence ao Morada, não aos provedores: é a emissão que diz do que
# precisa. Cada provedor ganha um adaptador que implementa esta interface.
from dataclasses import dataclass
from typing import Protocol

from morada.depois.cobranca.cobranca import Cobranca


@dataclass(frozen=True)
class Prazos:
    vencimento: str
    desconto_ate: str


@dataclass(frozen=True)
class Registro:
    unidade: str
    identificador: str


class GatewayDePagamento(Protocol):
    nome: str

    def registrar(self, cobranca: Cobranca, prazos: Prazos) -> Registro: ...
