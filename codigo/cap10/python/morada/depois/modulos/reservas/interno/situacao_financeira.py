# Depois: Reservas pergunta ao Financeiro pela API pública. A regra de
# inadimplência continua num lugar só, o módulo que é dono dela.
from morada.depois.modulos.financeiro.api import Financeiro


class SituacaoPeloFinanceiro:
    def __init__(self, financeiro: Financeiro):
        self._financeiro = financeiro

    def unidade_em_dia(self, unidade: str, hoje: str) -> bool:
        return self._financeiro.unidade_em_dia(unidade, hoje)
