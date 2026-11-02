# Entidade: tem identidade (o id) e ciclo de vida. Só muda pelos próprios métodos.
from morada.depois.dominio.dinheiro import Dinheiro
from morada.depois.dominio.erro import ErroDeDominio
from morada.depois.dominio.periodo import Periodo


class Reserva:
    def __init__(self, id: str, unidade: str, periodo: Periodo, taxa: Dinheiro):
        self.id = id
        self.unidade = unidade
        self.periodo = periodo
        self.taxa = taxa
        self._situacao = "confirmada"

    @property
    def ativa(self) -> bool:
        return self._situacao == "confirmada"

    def cancelar(self) -> None:
        if not self.ativa:
            raise ErroDeDominio("reserva não está confirmada")
        self._situacao = "cancelada"
