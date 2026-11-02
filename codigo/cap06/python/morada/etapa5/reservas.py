# Módulo de reservas. Etapa 5: fases separadas (Split Phase) e nenhum estado global.
# decidir() calcula; relatorio() e avisos() formatam; quem lê e grava é o main.
from dataclasses import dataclass
from datetime import date

ANTECEDENCIA_MINIMA_DIAS = 2
ACRESCIMO_SABADO_PORCENTO = 20
LIMITE_DE_CONVIDADOS = 50
TAXA_DE_LIMPEZA_EXTRA = 5000  # centavos


@dataclass(frozen=True)
class Decisao:
    pedido: dict
    email: str
    motivo: str | None
    valor: int


def dias_ate(data_iso: str, hoje: date) -> int:
    return (date.fromisoformat(data_iso) - hoje).days


# O comentário original dizia "fim de semana", mas o código só olha o sábado
def eh_sabado(data_iso: str) -> bool:
    return date.fromisoformat(data_iso).weekday() == 5


def valor_da_reserva(espaco: dict, pedido: dict) -> int:
    valor = espaco["taxa"]
    if eh_sabado(pedido["data"]):
        valor += valor * ACRESCIMO_SABADO_PORCENTO // 100
    if pedido["convidados"] > LIMITE_DE_CONVIDADOS:
        valor += TAXA_DE_LIMPEZA_EXTRA
    return valor


def motivo_da_recusa(pedido, unidade, hoje, aprovadas) -> str | None:
    if unidade["emDebito"]:
        return "débito"
    if dias_ate(pedido["data"], hoje) < ANTECEDENCIA_MINIMA_DIAS:
        return "antecedência"
    ocupado = any(
        r["espaco"] == pedido["espaco"] and r["data"] == pedido["data"]
        for r in aprovadas
    )
    return "conflito" if ocupado else None


def decidir(dados: dict, hoje: date) -> list[Decisao]:
    """Fase 1: decidir cada pedido, em ordem. As aprovadas agora são locais."""
    aprovadas, decisoes = [], []
    for pedido in dados["pedidos"]:
        unidade = next(u for u in dados["unidades"] if u["id"] == pedido["unidade"])
        espaco = next(e for e in dados["espacos"] if e["id"] == pedido["espaco"])
        motivo = motivo_da_recusa(pedido, unidade, hoje, aprovadas)
        valor = 0
        if not motivo:
            aprovadas.append(pedido)
            valor = valor_da_reserva(espaco, pedido)
        decisoes.append(Decisao(pedido, unidade["email"], motivo, valor))
    return decisoes


def reais(centavos: int) -> str:
    return f"{centavos // 100},{centavos % 100:02d}"


def relatorio(decisoes: list[Decisao]) -> list[str]:
    """Fase 2: formatar o relatório e os avisos a partir das decisões."""
    linhas = []
    for d in decisoes:
        p = d.pedido
        inicio = f"{p['id']};{p['unidade']};{p['espaco']};{p['data']}"
        fim = f"recusada;{d.motivo}" if d.motivo else f"aprovada;{reais(d.valor)}"
        linhas.append(f"{inicio};{fim}")
    return linhas


def avisos(decisoes: list[Decisao]) -> list[tuple[str, str]]:
    return [
        (
            d.email,
            (
                f"Reserva {d.pedido['id']} recusada ({d.motivo})"
                if d.motivo
                else f"Reserva {d.pedido['id']} confirmada. Valor: R$ {reais(d.valor)}"
            ),
        )
        for d in decisoes
    ]
