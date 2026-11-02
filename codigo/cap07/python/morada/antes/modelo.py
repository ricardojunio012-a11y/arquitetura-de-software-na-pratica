# Modelo anêmico: só dados, todos públicos e alteráveis. Nenhuma regra mora aqui.
from dataclasses import dataclass


@dataclass
class Reserva:
    id: str = ""
    unidade: str = ""
    espaco: str = ""
    data: str = ""
    inicio: int = 0
    fim: int = 0
    situacao: str = "confirmada"
    taxa_centavos: int = 0


# Os dados de todas as reservas, que qualquer parte do sistema pode ler e alterar
reservas: list[Reserva] = []
