# Recebe o pedido, consulta a cadeia de aprovação, guarda e anuncia o resultado.
from morada.aprovacao import Etapa
from morada.estado import Reserva
from morada.eventos import Barramento, Evento
from morada.repositorio import RepositorioDeReservas
from morada.tipos import Decisao, Pedido


class ServicoDeReservas:
    def __init__(
        self, aprovacao: Etapa, reservas: RepositorioDeReservas, eventos: Barramento
    ):
        self._aprovacao = aprovacao
        self._reservas = reservas
        self._eventos = eventos

    def solicitar(self, pedido: Pedido) -> Decisao:
        reserva = Reserva(pedido)
        decisao = self._aprovacao.avaliar(pedido)
        # A cadeia viu o espaço livre, mas outro pedido pode ter gravado depois:
        # a gravação confere de novo, numa operação só (passo 6 do laboratório)
        if decisao.aprovada and not self._reservas.salvar_se_livre(reserva):
            decisao = Decisao(False, "espaço já reservado nesta data")
        if decisao.aprovada:
            reserva.aprovar()
            self._eventos.publicar(Evento("ReservaConfirmada", pedido))
        else:
            reserva.recusar()
            self._reservas.salvar(reserva)
            self._eventos.publicar(Evento("ReservaRecusada", pedido, decisao.motivo))
        return decisao

    def cancelar(self, id: str) -> str:
        """O estado decide se a reserva pode ser cancelada."""
        reserva = self._reservas.buscar(id)
        if reserva is None:
            raise ValueError(f"reserva {id} não encontrada")
        antes = reserva.estado
        reserva.cancelar()
        return f"{antes} -> {reserva.estado}"
