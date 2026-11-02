# Classe-broto (sprout class, Feathers): a regra nova nasce fora do código legado,
# numa classe nova, pequena e com testes próprios. O legado só ganha uma chamada.

# Reservas por unidade, por espaço, no mesmo mês
LIMITES_PADRAO = {"salao": 1, "churrasqueira": 2}


class LimitePorMes:
    def __init__(self, limites=None):
        self._limites = LIMITES_PADRAO if limites is None else limites

    def atingido(self, pedido, aprovadas) -> bool:
        limite = self._limites.get(pedido["espaco"])
        if limite is None:
            return False
        mes = pedido["data"][:7]
        feitas = [
            r
            for r in aprovadas
            if r["unidade"] == pedido["unidade"]
            and r["espaco"] == pedido["espaco"]
            and r["data"][:7] == mes
        ]
        return len(feitas) >= limite
