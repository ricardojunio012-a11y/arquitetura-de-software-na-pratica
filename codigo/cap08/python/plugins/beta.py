# Plugin do Banco Beta: outro formato de número, mesmo contrato.
from morada.plugins.nucleo import Cobranca


class BancoBeta:
    nome = "beta"

    def __init__(self):
        self._ultimo = 0

    def registrar(self, cobranca: Cobranca) -> str:
        self._ultimo += 1
        return f"BETA/{self._ultimo:04d}"


plugin = BancoBeta()
