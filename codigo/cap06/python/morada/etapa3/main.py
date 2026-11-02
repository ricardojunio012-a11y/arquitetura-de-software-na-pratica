# Módulo de reservas. Etapa 3: nomes que dizem o que as coisas são e funções
# extraídas (Rename Variable, Extract Function). A estrutura ainda é a original.
import json
import os
import sys
from datetime import date

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
        valor = valor + valor * 20 // 100
    if pedido["convidados"] > 50:
        valor = valor + 5000
    return valor


def reais(centavos):
    return f"{centavos // 100},{centavos % 100:02d}"


def processar_reservas(arquivo, pasta, hoje=None, correio=smtp):
    hoje = hoje or date.today()
    dados = json.load(open(arquivo, encoding="utf-8"))
    linhas = []
    for pedido in dados["pedidos"]:
        unidade = [u for u in dados["unidades"] if u["id"] == pedido["unidade"]][0]
        espaco = [e for e in dados["espacos"] if e["id"] == pedido["espaco"]][0]
        aprovada = True
        motivo = ""
        if unidade["emDebito"]:
            aprovada = False
            motivo = "débito"
        else:
            if dias_ate(pedido["data"], hoje) < 2:
                aprovada = False
                motivo = "antecedência"
            else:
                for reserva in aprovadas:
                    if (
                        reserva["espaco"] == pedido["espaco"]
                        and reserva["data"] == pedido["data"]
                    ):
                        aprovada = False
                        motivo = "conflito"
        inicio = (
            f"{pedido['id']};{pedido['unidade']};{pedido['espaco']};{pedido['data']}"
        )
        if aprovada:
            valor = reais(valor_da_reserva(espaco, pedido))
            aprovadas.append(pedido)
            linhas.append(f"{inicio};aprovada;{valor}")
            correio.enviar(
                unidade["email"],
                f"Reserva {pedido['id']} confirmada. Valor: R$ {valor}",
            )
        else:
            linhas.append(f"{inicio};recusada;{motivo}")
            correio.enviar(
                unidade["email"], f"Reserva {pedido['id']} recusada ({motivo})"
            )
    os.makedirs(pasta, exist_ok=True)
    open(pasta + "/reservas.txt", "w", encoding="utf-8").write("\n".join(linhas) + "\n")
    open(pasta + "/emails.txt", "w", encoding="utf-8").write("\n".join(log) + "\n")


# Uso: python -m morada.etapa3.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
processar_reservas(entrada, saida, hoje)
