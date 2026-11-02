# O código novo: o módulo refatorado da etapa 5 mais a regra do limite, que já nasceu
# separada na etapa 6 (a classe-broto) e por isso migra sem ser reescrita.
from datetime import date

from morada.etapa5.reservas import Decisao, motivo_da_recusa, valor_da_reserva
from morada.etapa6.limite import LimitePorMes


def decidir(dados: dict, hoje: date, limite=None) -> list[Decisao]:
    limite = limite or LimitePorMes()
    aprovadas, decisoes = [], []
    for pedido in dados["pedidos"]:
        unidade = next(u for u in dados["unidades"] if u["id"] == pedido["unidade"])
        espaco = next(e for e in dados["espacos"] if e["id"] == pedido["espaco"])
        motivo = motivo_da_recusa(pedido, unidade, hoje, aprovadas)
        if not motivo and limite.atingido(pedido, aprovadas):
            motivo = "limite de reservas do mês atingido"
        valor = 0
        if not motivo:
            aprovadas.append(pedido)
            valor = valor_da_reserva(espaco, pedido)
        decisoes.append(Decisao(pedido, unidade["email"], motivo, valor))
    return decisoes
