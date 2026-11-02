# Camada de dados: onde as agendas ficam guardadas. Hoje, em memória; no capítulo 16,
# num banco de dados. As camadas de cima não percebem a troca.
from morada.camadas.dominio import Agenda, Espaco, NaoEncontradoErro


class RepositorioDeAgendas:
    def __init__(self, espacos: list[Espaco]):
        self._agendas = {e.id: Agenda(e) for e in espacos}

    def todas(self) -> list[Agenda]:
        return list(self._agendas.values())

    def do_espaco(self, id: str) -> Agenda:
        if id not in self._agendas:
            raise NaoEncontradoErro("espaço não encontrado")
        return self._agendas[id]

    def da_reserva(self, id: str) -> Agenda:
        for agenda in self._agendas.values():
            if agenda.tem(id):
                return agenda
        raise NaoEncontradoErro("reserva não encontrada")
