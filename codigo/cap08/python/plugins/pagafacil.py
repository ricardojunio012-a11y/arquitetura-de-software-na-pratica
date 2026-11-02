# Plugin da PagaFácil: gera uma cobrança Pix identificada pela unidade.
from morada.plugins.nucleo import Cobranca


class PagaFacil:
    nome = "pagafacil"

    def registrar(self, cobranca: Cobranca) -> str:
        return "PIX-" + cobranca.unidade.replace("-", "")


plugin = PagaFacil()
