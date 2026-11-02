# Etapa 1: o primeiro código do Morada. Tudo numa função só, como costuma nascer.
import json
import os
from datetime import date


def gerar_cobranca_mensal(entrada, saida, hoje=None):
    hoje = hoje or date.today()
    with open(entrada, encoding="utf-8") as f:
        dados = json.load(f)
    ano = hoje.year
    mes = f"{hoje.month:02d}"
    competencia = f"{mes}/{ano}"
    vencimento = f"10/{mes}/{ano}"
    nome = dados["condominio"]["nome"]

    def reais(c):
        return f"{c // 100:,}".replace(",", ".") + "," + f"{c % 100:02d}"

    linhas = [f"# Cobranças {competencia} - {nome} - vencimento {vencimento}"]
    linhas.append("unidade;morador;taxa;fundo;debito;multa;juros;total;pagamento")
    emails = ""

    for u in dados["unidades"]:
        # taxa pela fração ideal, arredondada para o centavo mais próximo
        despesas = dados["condominio"]["despesasDoMesCentavos"]
        taxa = (despesas * u["fracaoMilionesimos"] + 500000) // 1000000
        fundo = (taxa * 10 + 50) // 100  # fundo de reserva: 10%
        debito = 0
        multa = 0
        juros = 0
        if u["debitoAnterior"]:
            debito = u["debitoAnterior"]["valorCentavos"]
            multa = (debito * 2 + 50) // 100  # multa de 2%
            venc = date.fromisoformat(u["debitoAnterior"]["vencimento"])
            dias = (hoje - venc).days
            juros = (debito * dias + 1500) // 3000  # 1% ao mês, proporcional
        total = taxa + fundo + debito + multa + juros
        codigo = f"BOL-{dados['condominio']['id']}-{ano}{mes}-{u['id']}-{total}"

        valores = [reais(v) for v in (taxa, fundo, debito, multa, juros, total)]
        linhas.append(";".join([u["id"], u["morador"]["nome"], *valores, codigo]))

        emails += f"Para: {u['morador']['email']}\n"
        emails += f"Assunto: Taxa condominial {competencia} - {nome}"
        emails += f" - Unidade {u['id']}\n\n"
        emails += f"Olá, {u['morador']['nome']}.\n\n"
        emails += f"A taxa condominial de {competencia} da unidade {u['id']} "
        emails += "está disponível.\n"
        emails += f"Valor: R$ {reais(total)}\n"
        emails += f"Vencimento: {vencimento}\n"
        if debito > 0:
            emails += f"Inclui débito anterior de R$ {reais(debito)}, "
            emails += f"com multa de R$ {reais(multa)} e juros de R$ {reais(juros)}.\n"
        emails += f"Boleto: {codigo}\n\n"
        emails += f"Administração do {nome}\n----\n"

    os.makedirs(saida, exist_ok=True)
    with open(os.path.join(saida, "cobrancas.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    with open(os.path.join(saida, "emails.txt"), "w", encoding="utf-8") as f:
        f.write(emails)
