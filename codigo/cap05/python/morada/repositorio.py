# Repository: quem usa as reservas não sabe onde elas ficam guardadas.
from typing import Protocol

from morada.estado import Reserva


class RepositorioDeReservas(Protocol):
    def salvar(self, reserva: Reserva) -> None: ...

    # Verifica e grava numa operação só: no banco, uma restrição de unicidade
    def salvar_se_livre(self, reserva: Reserva) -> bool: ...

    def buscar(self, id: str) -> Reserva | None: ...

    def ocupado(self, espaco: str, data: str) -> bool: ...

    def contar_no_mes(self, unidade: str, espaco: str, mes: str) -> int: ...


class RepositorioEmMemoria:
    """Em memória para o laboratório; o capítulo 16 troca por um banco de dados.
    Guarda todas as reservas; as consultas só contam as aprovadas."""

    def __init__(self):
        self._reservas: list[Reserva] = []

    def salvar(self, reserva: Reserva) -> None:
        self._reservas.append(reserva)

    def salvar_se_livre(self, reserva: Reserva) -> bool:
        if self.ocupado(reserva.pedido.espaco.id, reserva.pedido.data):
            return False
        self.salvar(reserva)
        return True

    def buscar(self, id: str) -> Reserva | None:
        return next((r for r in self._reservas if r.pedido.id == id), None)

    def ocupado(self, espaco: str, data: str) -> bool:
        return any(p.espaco.id == espaco and p.data == data for p in self._aprovadas())

    def contar_no_mes(self, unidade: str, espaco: str, mes: str) -> int:
        return sum(
            1
            for p in self._aprovadas()
            if p.unidade.id == unidade
            and p.espaco.id == espaco
            and p.data.startswith(mes)
        )

    def _aprovadas(self):
        return [r.pedido for r in self._reservas if r.estado == "aprovada"]
