# Balde de fichas: começa cheio, com "rajada" fichas, e ganha "por_segundo" fichas por
# segundo, sem passar do máximo. Cada pedido gasta uma ficha; sem ficha, o pedido é
# recusado. As fichas são contadas em milésimos para a conta ficar exata com o tempo
# em milissegundos.
class BaldeDeFichas:
    def __init__(self, rajada: int, por_segundo: int):
        self.rajada = rajada
        self.por_segundo = por_segundo
        self.milesimos = rajada * 1000
        self.ultimo = 0

    def permite(self, agora_ms: int) -> bool:
        ganho = (agora_ms - self.ultimo) * self.por_segundo
        self.milesimos = min(self.rajada * 1000, self.milesimos + ganho)
        self.ultimo = agora_ms
        if self.milesimos < 1000:
            return False
        self.milesimos -= 1000
        return True
