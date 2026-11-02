# Chain of Responsibility: cada etapa verifica uma regra e, se o pedido passar,
# entrega para a próxima. O esqueleto de avaliar() é um Template Method.
from abc import ABC, abstractmethod
from datetime import date

from morada.repositorio import RepositorioDeReservas
from morada.tipos import Decisao, Pedido, dias_entre


class Etapa(ABC):
    _proxima: "Etapa | None" = None

    def depois(self, proxima: "Etapa") -> "Etapa":
        """Devolve a próxima etapa, para encadear: a.depois(b).depois(c)"""
        self._proxima = proxima
        return proxima

    def avaliar(self, pedido: Pedido) -> Decisao:
        motivo = self.verificar(pedido)
        if motivo:
            return Decisao(False, motivo)
        return self._proxima.avaliar(pedido) if self._proxima else Decisao(True)

    @abstractmethod
    def verificar(self, pedido: Pedido) -> str | None:
        """Cada etapa diz o motivo da recusa, ou None se o pedido passou."""


class UnidadeEmDia(Etapa):
    def verificar(self, pedido):
        return "unidade com débito em aberto" if pedido.unidade.emDebito else None


class AntecedenciaMinima(Etapa):
    def __init__(self, hoje: date):
        self._hoje = hoje

    def verificar(self, pedido):
        minimo = pedido.espaco.antecedenciaMinimaDias
        if dias_entre(self._hoje, pedido.data) >= minimo:
            return None
        return f"antecedência mínima de {minimo} dias"


class EspacoLivre(Etapa):
    def __init__(self, reservas: RepositorioDeReservas):
        self._reservas = reservas

    def verificar(self, pedido):
        ocupado = self._reservas.ocupado(pedido.espaco.id, pedido.data)
        return "espaço já reservado nesta data" if ocupado else None


class LimitePorMes(Etapa):
    def __init__(self, reservas: RepositorioDeReservas):
        self._reservas = reservas

    def verificar(self, pedido):
        feitas = self._reservas.contar_no_mes(
            pedido.unidade.id, pedido.espaco.id, pedido.data[:7]
        )
        if feitas < pedido.espaco.limitePorMes:
            return None
        return "limite de reservas do mês atingido"
