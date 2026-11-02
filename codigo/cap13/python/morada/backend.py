# O back-end do Morada (o monólito): Portaria cuida das encomendas e dos visitantes;
# Reservas sabe quem são os convidados de cada festa. Nenhum dos dois conhece telas.


class Portaria:
    def __init__(self, encomendas: list[dict]):
        self.encomendas = {
            e["encomenda"]: {**e, "situacao": "na portaria", "versao": 1}
            for e in encomendas
        }
        self.visitantes: list[dict] = []

    # Concorrência otimista: muda só se ninguém mudou desde a versão vista
    def mudar(self, id, situacao, versao_vista, tablet, hora) -> str:
        e = self.encomendas[id]
        if e["versao"] != versao_vista:
            por = f"pelo tablet {e['por']} às {e['hora']}"
            return f"conflito: {id} já {e['situacao']} {por}"
        e.update(situacao=situacao, versao=e["versao"] + 1, por=tablet, hora=hora)
        return "aplicada"

    def registrar_visitante(self, nome, reserva, tablet, hora) -> str:
        self.visitantes.append(
            {"nome": nome, "reserva": reserva, "tablet": tablet, "hora": hora}
        )
        return "aplicada"


class Reservas:
    def __init__(self, festas: list[dict]):
        self._convidados = [
            {"nome": nome, "reserva": f["reserva"], "espaco": f["espaco"]}
            for f in festas
            for nome in f["nomes"]
        ]

    def convidados(self) -> list[dict]:
        return list(self._convidados)
