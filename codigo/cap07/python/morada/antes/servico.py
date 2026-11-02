# Serviço que concentra todas as regras. As regras só valem se quem altera os dados
# lembrar de passar por aqui; nada impede outro código de mexer nas reservas direto.
from datetime import date

from morada.antes.modelo import Reserva, reservas


def dias(de, ate):
    return (date.fromisoformat(ate) - date.fromisoformat(de)).days


def formatar(centavos):
    inteiro = f"{centavos // 100:,}".replace(",", ".")
    return f"R$ {inteiro},{centavos % 100:02d}"


def reservar(c, espaco, eventos):
    if c["fim"] <= c["inicio"]:
        return "recusada;período inválido: o fim deve ser depois do início"
    if dias(c["em"], c["data"]) < espaco["antecedenciaMinimaDias"]:
        return "recusada;antecedência mínima não respeitada"
    for r in reservas:
        mesmo_horario = (
            r.data == c["data"] and r.inicio < c["fim"] and c["inicio"] < r.fim
        )
        if r.espaco == c["espaco"] and r.situacao == "confirmada" and mesmo_horario:
            return f"recusada;horário sobreposto a {r.id}"
    do_mes = [
        r
        for r in reservas
        if r.espaco == c["espaco"]
        and r.unidade == c["unidade"]
        and r.situacao == "confirmada"
        and r.data[:7] == c["data"][:7]
    ]
    if len(do_mes) >= espaco["limitePorMes"]:
        return "recusada;limite mensal da unidade atingido"

    taxa = espaco["taxaCentavos"]
    if date.fromisoformat(c["data"]).weekday() >= 5:
        taxa += (taxa * 20 + 50) // 100
    r = Reserva(c["reserva"], c["unidade"], c["espaco"], c["data"])
    r.inicio, r.fim, r.taxa_centavos = c["inicio"], c["fim"], taxa
    reservas.append(r)
    periodo = f"{c['data']} {c['inicio']}h-{c['fim']}h"
    eventos.append(
        f"ReservaConfirmada;{r.id};{r.espaco};{periodo};{r.unidade};{formatar(taxa)}"
    )
    return f"confirmada;{formatar(taxa)}"


def cancelar(c, eventos):
    r = next((x for x in reservas if x.id == c["reserva"]), None)
    if not r:
        return "não cancelada;reserva não encontrada"
    if r.situacao != "confirmada":
        return "não cancelada;reserva não está confirmada"
    r.situacao = "cancelada"
    multa = (r.taxa_centavos * 50 + 50) // 100 if dias(c["em"], r.data) < 2 else 0
    detalhe = f"multa {formatar(multa)}" if multa > 0 else "sem multa"
    eventos.append(f"ReservaCancelada;{r.id};{detalhe}")
    return f"cancelada;{detalhe}"
