# Tudo numa função: as regras num if atrás do outro e o Banco Alfa chamado no meio do
# cálculo. Uma regra nova ou outro banco exigem mudar esta função.
from morada.compartilhado.datas import (
    data_br,
    data_do_mes,
    dia_mes,
    dias_entre,
    rotulo_do_mes,
)
from morada.compartilhado.dinheiro import parte_de, percentual, reais, reais_com_ponto
from morada.externos.banco_alfa import ClienteBancoAlfa


def linha(texto, valor):
    return "  " + texto.ljust(40) + reais(valor).rjust(10)


def emitir_cobrancas(dados, hoje):
    p = dados["politica"]
    vencimento = data_do_mes(hoje, p["vencimentoDia"])
    desconto_ate = data_do_mes(hoje, p["descontoAteDia"])
    titulo = f"{rotulo_do_mes(hoje)} - {dados['condominio']['nome']}"
    banco = ClienteBancoAlfa()
    cobrancas = [f"# Cobranças {titulo}"]
    registros = [f"# Registros {titulo} - Banco Alfa"]
    registros.append("unidade;identificador;valor;desconto")

    for u in dados["unidades"]:
        itens = []
        despesas = dados["condominio"]["despesasDoMesCentavos"]
        taxa = parte_de(despesas, u["fracaoMilionesimos"])
        itens.append(("Taxa condominial", taxa))
        fundo = percentual(taxa, p["fundoDeReservaPorcento"])
        itens.append((f"Fundo de reserva ({p['fundoDeReservaPorcento']}%)", fundo))
        if u.get("sindico"):
            itens.append(("Isenção do síndico", -taxa))
        d = u["debitoAnterior"]
        if d:
            v = d["valorCentavos"]
            dias = dias_entre(d["vencimento"], hoje)
            juros = (v * p["jurosAoMesPorcento"] * dias + 1500) // 3000
            itens.append((f"Débito anterior (venc. {dia_mes(d['vencimento'])})", v))
            itens.append(
                (f"Multa ({p['multaPorcento']}%)", percentual(v, p["multaPorcento"]))
            )
            itens.append((f"Juros ({dias} dias)", juros))
        total = sum(valor for _, valor in itens)
        pd = p["descontoAntecipadoPorcento"]
        # Sem desconto para o síndico e para quem tem débito (regra do capítulo 1)
        desconto = 0 if u.get("sindico") or d else percentual(taxa, pd)

        cobrancas += ["", f"{u['id']} {u['morador']['nome']}"]
        cobrancas += [linha(t, v) for t, v in itens]
        ate = dia_mes(desconto_ate)
        if desconto > 0:
            cobrancas.append(linha(f"Desconto até {ate} ({pd}%)", -desconto))
        cobrancas.append(linha("Total", total))
        if desconto > 0:
            cobrancas.append(linha(f"Total com desconto até {ate}", total - desconto))

        # O cálculo conhece o banco: trocar de banco é mudar esta função
        pedido = {
            "pagador": u["morador"]["nome"],
            "valor": reais_com_ponto(total),
            "vencimento": data_br(vencimento),
        }
        if desconto > 0:
            pedido["desconto"] = {
                "valor": reais_com_ponto(desconto),
                "ate": data_br(desconto_ate),
            }
        boleto = banco.emitir_boleto(pedido)
        registros.append(
            f"{u['id']};boleto {boleto['nossoNumero']};{reais(total)};{reais(desconto)}"
        )
    return "\n".join(cobrancas) + "\n", "\n".join(registros) + "\n"
