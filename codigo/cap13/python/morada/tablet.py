# O app do porteiro, no tablet. Sem internet, guarda as operações numa fila local e
# segue trabalhando; ao reconectar, envia a fila ao BFF e mostra os conflitos.
from typing import Callable

from morada.bff import BffPorteiro


class Tablet:
    def __init__(
        self, nome: str, conectar: Callable[[], BffPorteiro], registro: list[str]
    ):
        self._nome = nome
        self._conectar = conectar
        self._registro = registro
        self._versoes: dict[str, int] = {}
        self._fila: list[dict] = []
        self._online = True
        self._contador = 0

    # O tablet fala com o endereço do BFF, seja qual for o processo que o atende
    @property
    def _bff(self) -> BffPorteiro:
        return self._conectar()

    def _log(self, texto: str) -> None:
        self._registro.append(f"tablet {self._nome} {texto}")

    def abrir(self) -> None:
        tela = self._bff.inicio()
        for e in tela["encomendasPendentes"]:
            self._versoes[e["encomenda"]] = e["versao"]
        pendentes = ", ".join(e["encomenda"] for e in tela["encomendasPendentes"])
        esperados = ", ".join(v["nome"] for v in tela["visitantesEsperados"])
        self._log(
            f"abriu: encomendas [{pendentes}], visitantes esperados [{esperados}]"
        )

    def desconectar(self) -> None:
        self._online = False
        self._log("perdeu a internet")

    def operar(self, op: dict) -> None:
        self._contador += 1
        op = {"id": f"op-{self._nome}{self._contador}", **op}
        if "encomenda" in op:
            op["versaoVista"] = self._versoes[op["encomenda"]]
        if not self._online:
            self._fila.append(op)
            self._log(f"guardou {self._descrever(op)} na fila local")
            return
        [(_, resultado)] = self._bff.sincronizar(self._nome, [op])
        self._log(f"enviou {self._descrever(op)}: {resultado}")

    # Ao reconectar, a fila vai em lote, e a resposta pode se perder no caminho
    def reconectar(self, perder_resposta: bool) -> None:
        self._online = True
        resultados = self._bff.sincronizar(self._nome, self._fila)
        if perder_resposta:
            n = len(self._fila)
            self._log(f"voltou e enviou {n} operações; a resposta se perdeu")
            return
        self._mostrar("enviou", resultados)

    # Sem resposta, o tablet não sabe o que foi aplicado: reenvia o mesmo lote
    def reenviar(self) -> None:
        self._mostrar("reenviou", self._bff.sincronizar(self._nome, self._fila))

    def _mostrar(self, verbo: str, resultados: list) -> None:
        self._log(f"{verbo} {len(self._fila)} operações:")
        for op, resultado in resultados:
            self._registro.append(f"  {self._descrever(op)}: {resultado}")
        self._fila.clear()

    @staticmethod
    def _descrever(op: dict) -> str:
        alvo = op.get("encomenda") or op.get("nome")
        return f"{op['id']} ({op['tipo']} {alvo})"
