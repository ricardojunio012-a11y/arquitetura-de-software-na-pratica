# Serviço de aplicação: traduz um comando em chamadas ao domínio. Carrega o
# agregado, pede o trabalho a ele, salva e publica os eventos. Sem regra de negócio.
from dataclasses import dataclass

from morada.depois.dominio.erro import ErroDeDominio
from morada.depois.dominio.periodo import Periodo


@dataclass(frozen=True)
class Resultado:
    reserva: str
    comando: str
    situacao: str
    detalhe: str


class ServicoDeReservas:
    def __init__(self, agendas, publicar):
        self._agendas = agendas
        self._publicar = publicar

    def executar(self, c: dict) -> Resultado:
        try:
            if c["tipo"] == "reservar":
                return self._reservar(c)
            return self._cancelar(c)
        except ErroDeDominio as erro:
            situacao = "recusada" if c["tipo"] == "reservar" else "não cancelada"
            return Resultado(c["reserva"], c["tipo"], situacao, str(erro))

    def _reservar(self, c: dict) -> Resultado:
        periodo = Periodo(c["data"], c["inicio"], c["fim"])
        agenda = self._agendas.do_espaco(c["espaco"])
        reserva = agenda.reservar(c["reserva"], c["unidade"], periodo, c["em"])
        self._salvar(agenda)
        return Resultado(c["reserva"], c["tipo"], "confirmada", str(reserva.taxa))

    def _cancelar(self, c: dict) -> Resultado:
        agenda = self._agendas.da_reserva(c["reserva"])
        multa = agenda.cancelar(c["reserva"], c["em"])
        self._salvar(agenda)
        detalhe = f"multa {multa}" if multa.centavos > 0 else "sem multa"
        return Resultado(c["reserva"], c["tipo"], "cancelada", detalhe)

    def _salvar(self, agenda) -> None:
        self._agendas.salvar(agenda)
        for evento in agenda.recolher_eventos():
            self._publicar(evento)
