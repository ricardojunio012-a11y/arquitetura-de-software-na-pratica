# O módulo de Comunicação: envia avisos aos moradores. É idempotente pelo
# identificador do aviso: o mesmo aviso pedido duas vezes é enviado uma vez só.


class Comunicacao:
    def __init__(self):
        self._enviados: set[str] = set()

    # Devolve True se enviou agora e False se o aviso já tinha sido enviado
    def avisar(self, id: str, texto: str) -> bool:
        if id in self._enviados:
            return False
        self._enviados.add(id)
        return True
