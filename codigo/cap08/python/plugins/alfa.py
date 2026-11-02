# Plugin do Banco Alfa: numera os boletos em sequência, com cinco dígitos.
from morada.plugins.nucleo import Cobranca


class BancoAlfa:
    nome = "alfa"

    def __init__(self):
        self._ultimo = 0

    def registrar(self, cobranca: Cobranca) -> str:
        self._ultimo += 1
        return f"ALFA-{self._ultimo:05d}"


plugin = BancoAlfa()
