# Dado privado de Reservas: um espaço, uma reserva por dia (simplificado).
class Agenda:
    def __init__(self, espacos: list[str]):
        self._espacos = set(espacos)
        self._ocupacao: dict[str, str] = {}

    def ocupante(self, espaco: str, data: str) -> str | None:
        if espaco not in self._espacos:
            raise LookupError(f"espaço {espaco} não existe")
        return self._ocupacao.get(f"{espaco} {data}")

    def registrar(self, reserva: str, espaco: str, data: str) -> None:
        self._ocupacao[f"{espaco} {data}"] = reserva
