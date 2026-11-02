# Observer: quem publica um evento não conhece quem reage a ele.
from dataclasses import dataclass
from typing import Protocol

from morada.tipos import Pedido


@dataclass(frozen=True)
class Evento:
    tipo: str  # "ReservaConfirmada" ou "ReservaRecusada"
    pedido: Pedido
    motivo: str | None = None


class Assinante(Protocol):
    nome: str

    def tratar(self, evento: Evento) -> None: ...


class Barramento:
    def __init__(self):
        self._assinantes: dict[str, list[Assinante]] = {}
        self.falhas: list[str] = []

    def assinar(self, tipo: str, assinante: Assinante) -> None:
        self._assinantes.setdefault(tipo, []).append(assinante)

    def publicar(self, evento: Evento) -> None:
        """Um assinante que falha não impede os outros de receberem o evento."""
        for assinante in self._assinantes.get(evento.tipo, []):
            try:
                assinante.tratar(evento)
            except Exception as erro:
                id = evento.pedido.id
                self.falhas.append(f"{evento.tipo} {id}: {assinante.nome}: {erro}")
