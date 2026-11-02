# Agregado: a agenda de um espaço é a fronteira de consistência. As regras que
# envolvem várias reservas (sobreposição, limite por unidade) só são garantidas
# por quem conhece todas elas. Ninguém de fora altera uma reserva sem passar por aqui.
from dataclasses import dataclass

from morada.depois.dominio.dinheiro import ZERO, Dinheiro
from morada.depois.dominio.erro import ErroDeDominio
from morada.depois.dominio.eventos import ReservaCancelada, ReservaConfirmada
from morada.depois.dominio.periodo import Periodo
from morada.depois.dominio.reserva import Reserva

ACRESCIMO_FIM_DE_SEMANA_PORCENTO = 20
MULTA_CANCELAMENTO_PORCENTO = 50
PRAZO_CANCELAMENTO_SEM_MULTA_DIAS = 2


@dataclass(frozen=True)
class PoliticaDeUso:
    taxa: Dinheiro
    antecedencia_minima_dias: int
    limite_por_mes: int


class Agenda:
    def __init__(self, espaco: str, politica: PoliticaDeUso):
        self.espaco = espaco
        self._politica = politica
        self._reservas: list[Reserva] = []
        self._eventos: list = []

    def reservar(self, id: str, unidade: str, periodo: Periodo, hoje: str) -> Reserva:
        if periodo.dias_desde(hoje) < self._politica.antecedencia_minima_dias:
            raise ErroDeDominio("antecedência mínima não respeitada")
        conflito = next((r for r in self.ativas() if r.periodo.sobrepoe(periodo)), None)
        if conflito:
            raise ErroDeDominio(f"horário sobreposto a {conflito.id}")
        do_mes = [
            r
            for r in self.ativas()
            if r.unidade == unidade and r.periodo.mes() == periodo.mes()
        ]
        if len(do_mes) >= self._politica.limite_por_mes:
            raise ErroDeDominio("limite mensal da unidade atingido")
        reserva = Reserva(id, unidade, periodo, self._taxa_para(periodo))
        self._reservas.append(reserva)
        self._eventos.append(
            ReservaConfirmada(id, self.espaco, periodo, unidade, reserva.taxa)
        )
        return reserva

    def cancelar(self, id: str, hoje: str) -> Dinheiro:
        reserva = next((r for r in self._reservas if r.id == id), None)
        if not reserva:
            raise ErroDeDominio("reserva não encontrada")
        reserva.cancelar()
        em_cima_da_hora = (
            reserva.periodo.dias_desde(hoje) < PRAZO_CANCELAMENTO_SEM_MULTA_DIAS
        )
        multa = (
            reserva.taxa.percentual(MULTA_CANCELAMENTO_PORCENTO)
            if em_cima_da_hora
            else ZERO
        )
        self._eventos.append(ReservaCancelada(id, multa))
        return multa

    def tem(self, id: str) -> bool:
        return any(r.id == id for r in self._reservas)

    def ativas(self) -> list[Reserva]:
        return [r for r in self._reservas if r.ativa]

    def recolher_eventos(self) -> list:
        """Quem salva o agregado recolhe os eventos para publicá-los depois."""
        eventos, self._eventos = self._eventos, []
        return eventos

    def _taxa_para(self, periodo: Periodo) -> Dinheiro:
        taxa = self._politica.taxa
        if not periodo.eh_fim_de_semana():
            return taxa
        return taxa.somar(taxa.percentual(ACRESCIMO_FIM_DE_SEMANA_PORCENTO))
