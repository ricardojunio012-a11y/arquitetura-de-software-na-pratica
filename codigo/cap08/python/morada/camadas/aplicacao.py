# Camada de aplicação: os casos de uso. Recebe dados simples, chama o domínio e o
# repositório e devolve dados simples. Não sabe que existe HTTP.
from morada.camadas.dados import RepositorioDeAgendas
from morada.camadas.dominio import reais


class ServicoDeReservas:
    def __init__(self, agendas: RepositorioDeAgendas):
        self._agendas = agendas

    def listar_espacos(self) -> list[dict]:
        return [
            {
                "id": a.espaco.id,
                "taxa": reais(a.espaco.taxa_centavos),
                "antecedenciaMinimaDias": a.espaco.antecedencia_minima_dias,
            }
            for a in self._agendas.todas()
        ]

    def reservar(self, p: dict) -> dict:
        agenda = self._agendas.do_espaco(p["espaco"])
        r = agenda.reservar(
            p["reserva"], p["unidade"], p["data"], p["inicio"], p["fim"], p["em"]
        )
        return {
            "reserva": r.id,
            "situacao": "confirmada",
            "taxa": reais(r.taxa_centavos),
        }

    def cancelar(self, reserva: str, em: str) -> dict:
        multa = self._agendas.da_reserva(reserva).cancelar(reserva, em)
        return {"reserva": reserva, "situacao": "cancelada", "multa": reais(multa)}

    def reservas_do_espaco(self, espaco: str) -> list[dict]:
        return [
            {
                "reserva": r.id,
                "unidade": r.unidade,
                "periodo": f"{r.data} {r.inicio}h-{r.fim}h",
            }
            for r in self._agendas.do_espaco(espaco).reservas()
        ]
