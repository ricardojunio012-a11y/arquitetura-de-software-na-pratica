# API pública de Reservas. O módulo declara o que precisa saber do Financeiro
# (SituacaoFinanceira) sem depender de como o Financeiro guarda os dados.
from typing import Protocol

from morada.antes.modulos.reservas.interno.agenda import Agenda


class SituacaoFinanceira(Protocol):
    def unidade_em_dia(self, unidade: str, hoje: str) -> bool: ...


class RecusaErro(Exception):
    pass


class Reservas:
    def __init__(self, espacos: list[str], financeiro: SituacaoFinanceira):
        self._agenda = Agenda(espacos)
        self._financeiro = financeiro

    def reservar(self, reserva, unidade, espaco, data, em) -> str:
        if not self._financeiro.unidade_em_dia(unidade, em):
            raise RecusaErro(f"unidade {unidade} em débito")
        if self._agenda.ocupante(espaco, data):
            raise RecusaErro(f"{espaco} já reservado em {data}")
        self._agenda.registrar(reserva, espaco, data)
        return f"{unidade} {espaco} {data}"
