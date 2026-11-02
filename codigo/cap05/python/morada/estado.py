# State: o que se pode fazer com uma reserva depende do estado em que ela está.
# Cada estado é um objeto que sabe quais transições aceita; a reserva só repassa.
from morada.tipos import Pedido


class Estado:
    nome = ""

    # Por padrão, nenhuma transição é permitida; cada estado libera as suas
    def aprovar(self, reserva: "Reserva") -> None:
        self._recusar_transicao("aprovar")

    def recusar(self, reserva: "Reserva") -> None:
        self._recusar_transicao("recusar")

    def cancelar(self, reserva: "Reserva") -> None:
        self._recusar_transicao("cancelar")

    def _recusar_transicao(self, acao: str):
        raise ValueError(f"não é possível {acao} uma reserva {self.nome}")


class Pendente(Estado):
    nome = "pendente"

    def aprovar(self, reserva):
        reserva.mudar_para(APROVADA)

    def recusar(self, reserva):
        reserva.mudar_para(RECUSADA)

    def cancelar(self, reserva):
        reserva.mudar_para(CANCELADA)


class Aprovada(Estado):
    nome = "aprovada"

    def cancelar(self, reserva):
        reserva.mudar_para(CANCELADA)


class Recusada(Estado):
    nome = "recusada"


class Cancelada(Estado):
    nome = "cancelada"


# Os estados não guardam dados próprios: uma instância de cada basta
APROVADA = Aprovada()
RECUSADA = Recusada()
CANCELADA = Cancelada()


class Reserva:
    def __init__(self, pedido: Pedido):
        self.pedido = pedido
        self._estado: Estado = Pendente()

    @property
    def estado(self) -> str:
        return self._estado.nome

    def aprovar(self) -> None:
        self._estado.aprovar(self)

    def recusar(self) -> None:
        self._estado.recusar(self)

    def cancelar(self) -> None:
        self._estado.cancelar(self)

    def mudar_para(self, estado: Estado) -> None:
        """Usado só pelos estados."""
        self._estado = estado
