# O serviço de Comunicação do capítulo 12, agora com um repositório de avisos: o
# mesmo aviso pedido duas vezes é enviado uma vez só.
from typing import Protocol


class DadosInvalidosErro(Exception):
    pass


class RepositorioDeAvisos(Protocol):
    def ja_enviado(self, id: str) -> bool: ...

    def registrar(self, id: str, texto: str) -> None: ...


class Comunicacao:
    def __init__(self, avisos: RepositorioDeAvisos):
        self._avisos = avisos

    def avisar(self, id: str, texto: str) -> str:
        if not texto:
            raise DadosInvalidosErro("texto obrigatório")
        if self._avisos.ja_enviado(id):
            return "repetido"
        self._avisos.registrar(id, texto)
        return "enviado"


class AvisosEmMemoria:
    def __init__(self):
        self._avisos: dict[str, str] = {}

    def ja_enviado(self, id: str) -> bool:
        return id in self._avisos

    def registrar(self, id: str, texto: str) -> None:
        self._avisos[id] = texto
