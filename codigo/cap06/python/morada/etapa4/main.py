# Módulo de reservas. Etapa 4: condicionais e números mágicos (Replace Nested
# Conditional with Guard Clauses, Replace Magic Literal, Replace Loop with Pipeline).
import json
import os
import sys
from datetime import date

ANTECEDENCIA_MINIMA_DIAS = 2
ACRESCIMO_SABADO_PORCENTO = 20
LIMITE_DE_CONVIDADOS = 50
TAXA_DE_LIMPEZA_EXTRA = 5000  # centavos

aprovadas = []
log = []


class Smtp:
    def enviar(self, para, texto):
        log.append("para " + para + ": " + texto)


smtp = Smtp()


def dias_ate(data_iso, hoje):
    return (date.fromisoformat(data_iso) - hoje).days


# O comentário original dizia "fim de semana", mas o código só olha o sábado
def eh_sabado(data_iso):
    return date.fromisoformat(data_iso).weekday() == 5


def valor_da_reserva(espaco, pedido):
    valor = espaco["taxa"]
    if eh_sabado(pedido["data"]):
        valor += valor * ACRESCIMO_SABADO_PORCENTO // 100
    if pedido["convidados"] > LIMITE_DE_CONVIDADOS:
        valor += TAXA_DE_LIMPEZA_EXTRA
    return valor


def reais(centavos):
    return f"{centavos // 100},{centavos % 100:02d}"


def motivo_da_recusa(pedido, unidade, hoje):
    """Cláusulas de guarda: a primeira regra que falha devolve o motivo."""
    if unidade["emDebito"]:
        return "débito"
    if dias_ate(pedido["data"], hoje) < ANTECEDENCIA_MINIMA_DIAS:
        return "antecedência"
    ocupado = any(
        r["espaco"] == pedido["espaco"] and r["data"] == pedido["data"]
        for r in aprovadas
    )
    if ocupado:
        return "conflito"
    return None


def processar_reservas(arquivo, pasta, hoje=None, correio=smtp):
    hoje = hoje or date.today()
    dados = json.load(open(arquivo, encoding="utf-8"))
    linhas = []
    for pedido in dados["pedidos"]:
        unidade = next(u for u in dados["unidades"] if u["id"] == pedido["unidade"])
        espaco = next(e for e in dados["espacos"] if e["id"] == pedido["espaco"])
        motivo = motivo_da_recusa(pedido, unidade, hoje)
        inicio = (
            f"{pedido['id']};{pedido['unidade']};{pedido['espaco']};{pedido['data']}"
        )
        if motivo:
            linhas.append(f"{inicio};recusada;{motivo}")
            correio.enviar(
                unidade["email"], f"Reserva {pedido['id']} recusada ({motivo})"
            )
            continue
        valor = reais(valor_da_reserva(espaco, pedido))
        aprovadas.append(pedido)
        linhas.append(f"{inicio};aprovada;{valor}")
        correio.enviar(
            unidade["email"], f"Reserva {pedido['id']} confirmada. Valor: R$ {valor}"
        )
    os.makedirs(pasta, exist_ok=True)
    open(pasta + "/reservas.txt", "w", encoding="utf-8").write("\n".join(linhas) + "\n")
    open(pasta + "/emails.txt", "w", encoding="utf-8").write("\n".join(log) + "\n")


# Uso: python -m morada.etapa4.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
processar_reservas(entrada, saida, hoje)
