# Repositório: um por agregado. Salva a agenda inteira, nunca uma reserva solta.
from morada.depois.dominio.agenda import Agenda, PoliticaDeUso
from morada.depois.dominio.erro import ErroDeDominio


class AgendasEmMemoria:
    """Em memória no laboratório; o capítulo 16 guarda as agendas num banco."""

    def __init__(self, politicas: dict[str, PoliticaDeUso]):
        self._agendas = {e: Agenda(e, p) for e, p in politicas.items()}

    def do_espaco(self, espaco: str) -> Agenda:
        if espaco not in self._agendas:
            raise ErroDeDominio(f"espaço desconhecido: {espaco}")
        return self._agendas[espaco]

    def da_reserva(self, reserva: str) -> Agenda:
        agenda = next((a for a in self._agendas.values() if a.tem(reserva)), None)
        if not agenda:
            raise ErroDeDominio("reserva não encontrada")
        return agenda

    def salvar(self, agenda: Agenda) -> None:
        self._agendas[agenda.espaco] = agenda

    def todas(self) -> list[Agenda]:
        return list(self._agendas.values())
