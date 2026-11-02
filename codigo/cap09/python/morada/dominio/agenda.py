# O centro do hexágono: as regras de reserva. Não importa nada de fora do domínio.
from dataclasses import dataclass
from datetime import date


class RegraVioladaErro(Exception):
    pass


class NaoEncontradoErro(Exception):
    pass


def reais(centavos: int) -> str:
    inteiro = f"{centavos // 100:,}".replace(",", ".")
    return f"R$ {inteiro},{centavos % 100:02d}"


@dataclass(frozen=True)
class Espaco:
    id: str
    taxa_centavos: int
    antecedencia_minima_dias: int


@dataclass(frozen=True)
class Reserva:
    id: str
    unidade: str
    data: str
    inicio: int
    fim: int
    taxa_centavos: int


def dias(de: str, ate: str) -> int:
    return (date.fromisoformat(ate) - date.fromisoformat(de)).days


class Agenda:
    # Um repositório que carrega uma agenda salva passa as reservas existentes
    def __init__(self, espaco: Espaco, reservas: list[Reserva] | None = None):
        self.espaco = espaco
        self._reservas = list(reservas or [])

    def reservar(self, id, unidade, data, inicio, fim, hoje) -> Reserva:
        if fim <= inicio:
            raise RegraVioladaErro("período inválido")
        if dias(hoje, data) < self.espaco.antecedencia_minima_dias:
            raise RegraVioladaErro("antecedência mínima não respeitada")
        for r in self._reservas:
            if r.data == data and r.inicio < fim and inicio < r.fim:
                raise RegraVioladaErro(f"horário sobreposto a {r.id}")
        base = self.espaco.taxa_centavos
        fim_de_semana = date.fromisoformat(data).weekday() >= 5
        taxa = base + (base * 20 + 50) // 100 if fim_de_semana else base
        reserva = Reserva(id, unidade, data, inicio, fim, taxa)
        self._reservas.append(reserva)
        return reserva

    # Devolve a multa em centavos: 50% da taxa se faltar menos de 2 dias
    def cancelar(self, id: str, hoje: str) -> int:
        for i, r in enumerate(self._reservas):
            if r.id == id:
                del self._reservas[i]
                if dias(hoje, r.data) < 2:
                    return (r.taxa_centavos * 50 + 50) // 100
                return 0
        raise NaoEncontradoErro("reserva não encontrada")

    # Em ordem de data e horário, qualquer que seja a ordem em que foram guardadas
    def reservas(self) -> list[Reserva]:
        return sorted(self._reservas, key=lambda r: (r.data, r.inicio))
