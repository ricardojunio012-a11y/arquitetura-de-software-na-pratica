# O Backend for Frontend do app do porteiro. Pertence ao time do app e fala a língua
# da tela: junta numa chamada o que o tablet precisa e recebe as operações feitas
# sem internet, em lote, aplicando cada uma uma vez só.
from morada.backend import Portaria, Reservas


class BffPorteiro:
    # Sem o terceiro argumento, os resultados ficam só na memória deste processo
    def __init__(
        self,
        portaria: Portaria,
        reservas: Reservas,
        resultados: dict[str, str] | None = None,
    ):
        self._portaria = portaria
        self._reservas = reservas
        self._resultados = {} if resultados is None else resultados
        self.repetidas = 0

    # A tela inicial inteira numa chamada, só com os campos que o tablet mostra
    def inicio(self) -> dict:
        pendentes = [
            {
                "encomenda": e["encomenda"],
                "unidade": e["unidade"],
                "versao": e["versao"],
            }
            for e in self._portaria.encomendas.values()
            if e["situacao"] == "na portaria"
        ]
        # Compara nome e reserva campo a campo: "Ana" não pode casar com "Maria Ana"
        entraram = {(v["nome"], v["reserva"]) for v in self._portaria.visitantes}
        esperados = [
            c
            for c in self._reservas.convidados()
            if (c["nome"], c["reserva"]) not in entraram
        ]
        return {"encomendasPendentes": pendentes, "visitantesEsperados": esperados}

    # Idempotente pelo id da operação: um lote reenviado não aplica nada duas vezes
    def sincronizar(self, tablet: str, operacoes: list[dict]) -> list[tuple[dict, str]]:
        saida = []
        for op in operacoes:
            if op["id"] in self._resultados:
                self.repetidas += 1
                saida.append((op, self._resultados[op["id"]]))
                continue
            if op["tipo"] == "registrarVisitante":
                resultado = self._portaria.registrar_visitante(
                    op["nome"], op["reserva"], tablet, op["hora"]
                )
            else:
                situacao = "entregue" if op["tipo"] == "entregar" else "devolvida"
                resultado = self._portaria.mudar(
                    op["encomenda"], situacao, op["versaoVista"], tablet, op["hora"]
                )
            self._resultados[op["id"]] = resultado
            saida.append((op, resultado))
        return saida
