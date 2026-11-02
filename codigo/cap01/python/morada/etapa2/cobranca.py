# Etapa 2: o código original depois dos três pedidos de mudança
# (desconto por pontualidade, Pix e aviso por WhatsApp), feitos do jeito mais direto.
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
    limite_desconto = f"05/{mes}/{ano}"
    nome = dados["condominio"]["nome"]

    def reais(c):
        return f"{c // 100:,}".replace(",", ".") + "," + f"{c % 100:02d}"

    linhas = [f"# Cobranças {competencia} - {nome} - vencimento {vencimento}"]
    linhas.append(
        "unidade;morador;taxa;fundo;debito;multa;juros;total;total_ate_05;pagamento"
    )
    emails = ""
    whatsapp = ""

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
        # desconto de 5% sobre a taxa para quem paga até o dia 5 sem débito
        total_ate_05 = 0
        if debito == 0:
            total_ate_05 = total - (taxa * 5 + 50) // 100
        if u["meioPagamento"] == "pix":
            codigo = f"PIX-{dados['condominio']['id']}-{ano}{mes}-{u['id']}-{total}"
        else:
            codigo = f"BOL-{dados['condominio']['id']}-{ano}{mes}-{u['id']}-{total}"

        valores = [reais(v) for v in (taxa, fundo, debito, multa, juros, total)]
        valores.append(reais(total_ate_05) if total_ate_05 > 0 else "-")
        linhas.append(";".join([u["id"], u["morador"]["nome"], *valores, codigo]))

        if u["morador"]["canal"] == "whatsapp":
            whatsapp += f"Para: {u['morador']['telefone']}\n"
            whatsapp += f"{nome}: taxa {competencia} da unidade {u['id']}: "
            whatsapp += f"R$ {reais(total)}, vence {vencimento}."
            if total_ate_05 > 0:
                whatsapp += f" Até {limite_desconto}: R$ {reais(total_ate_05)}."
            meio = "Pix copia e cola" if u["meioPagamento"] == "pix" else "Boleto"
            whatsapp += f" {meio}: {codigo}\n----\n"
        else:
            emails += f"Para: {u['morador']['email']}\n"
            emails += f"Assunto: Taxa condominial {competencia} - {nome}"
            emails += f" - Unidade {u['id']}\n\n"
            emails += f"Olá, {u['morador']['nome']}.\n\n"
            emails += f"A taxa condominial de {competencia} da unidade {u['id']} "
            emails += "está disponível.\n"
            emails += f"Valor: R$ {reais(total)}\n"
            emails += f"Vencimento: {vencimento}\n"
            if total_ate_05 > 0:
                emails += f"Pagando até {limite_desconto}, o valor cai para "
                emails += f"R$ {reais(total_ate_05)}.\n"
            if debito > 0:
                emails += f"Inclui débito anterior de R$ {reais(debito)}, "
                emails += (
                    f"com multa de R$ {reais(multa)} e juros de R$ {reais(juros)}.\n"
                )
            if u["meioPagamento"] == "pix":
                emails += f"Pix copia e cola: {codigo}\n\n"
            else:
                emails += f"Boleto: {codigo}\n\n"
            emails += f"Administração do {nome}\n----\n"

    os.makedirs(saida, exist_ok=True)
    with open(os.path.join(saida, "cobrancas.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    with open(os.path.join(saida, "emails.txt"), "w", encoding="utf-8") as f:
        f.write(emails)
    with open(os.path.join(saida, "whatsapp.txt"), "w", encoding="utf-8") as f:
        f.write(whatsapp)
