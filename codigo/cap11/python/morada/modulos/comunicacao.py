# Comunicação assina o mesmo evento e avisa o morador. Não conhece Reservas:
# tudo o que precisa veio dentro do evento.
from morada.eventos import reais


class Comunicacao:
    def __init__(self):
        self._processados: set[str] = set()
        self.avisos: list[str] = []
        self.registro: list[str] = []

    def ao_confirmar_pagamento(self, e: dict) -> None:
        if e["evento"] in self._processados:
            self.registro.append(f"comunicacao ignorou {e['evento']} (repetido)")
            return
        self._processados.add(e["evento"])
        valor = reais(e["valorCentavos"])
        self.avisos.append(
            f"{e['unidade']}: pagamento {e['pagamento']} de {valor} recebido; "
            f"reserva {e['reserva']} confirmada"
        )
        self.registro.append(
            f"comunicacao recebeu {e['evento']}: avisou {e['unidade']}"
        )
