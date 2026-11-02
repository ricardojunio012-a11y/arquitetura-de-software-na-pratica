# Reservas assina PagamentoConfirmado: a reserva aguardando pagamento é confirmada.
# O assinante é idempotente, porque o broker entrega "pelo menos uma vez".


class Reservas:
    def __init__(self, iniciais: list[dict]):
        self._reservas = {
            r["reserva"]: {**r, "situacao": "aguardando pagamento"} for r in iniciais
        }
        self._processados: set[str] = set()
        self.registro: list[str] = []

    def ao_confirmar_pagamento(self, e: dict) -> None:
        if e["evento"] in self._processados:
            self.registro.append(f"reservas ignorou {e['evento']} (repetido)")
            return
        self._processados.add(e["evento"])
        self._reservas[e["reserva"]]["situacao"] = "confirmada"
        self.registro.append(
            f"reservas recebeu {e['evento']}: {e['reserva']} confirmada"
        )

    def linhas(self) -> list[str]:
        return [
            f"{r['reserva']};{r['unidade']};{r['espaco']};{r['data']};{r['situacao']}"
            for r in self._reservas.values()
        ]
