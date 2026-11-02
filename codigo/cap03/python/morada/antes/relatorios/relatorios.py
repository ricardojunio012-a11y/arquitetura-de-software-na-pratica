# Relatórios do financeiro: inadimplência e prestação de contas.
import morada.antes.servicos.servicos as servicos
from morada.antes.config.config import config
from morada.antes.util.util import competencia, dias_de_atraso, reais


def gerar_relatorio(tipo):
    nome = config.dados["condominio"]["nome"]
    if tipo == "inadimplencia":
        # Ordena a lista do outro módulo no lugar (acoplamento de conteúdo)
        servicos.cobrancas.sort(key=lambda c: c["debito"], reverse=True)
        linhas = [f"# Inadimplência {competencia()} - {nome}"]
        linhas.append("unidade;morador;dias;debito;multa;juros;atualizado")
        soma = [0, 0, 0, 0]
        for c in [x for x in servicos.cobrancas if x["debito"] > 0]:
            venc = c["unidade"]["debitoAnterior"]["vencimento"]
            juros = servicos.juros_de_mora(
                c["debito"], venc
            )  # recalcula o que já existe
            valores = [c["debito"], c["multa"], juros, c["debito"] + c["multa"] + juros]
            soma = [s + v for s, v in zip(soma, valores)]
            u = c["unidade"]
            campos = [u["id"], u["morador"]["nome"], str(dias_de_atraso(venc))]
            linhas.append(";".join(campos + [reais(v) for v in valores]))
        linhas.append(";".join(["total", "", ""] + [reais(s) for s in soma]))
        return "\n".join(linhas) + "\n"
    # qualquer outro tipo vira prestação de contas
    taxas = sum(c["taxa"] for c in servicos.cobrancas)
    fundo = sum(c["fundo"] for c in servicos.cobrancas)
    linhas = [f"# Prestação de contas {competencia()} - {nome}"]
    linhas.append(f"receitas;taxas condominiais;{reais(taxas)}")
    linhas.append(f"receitas;fundo de reserva;{reais(fundo)}")
    total_despesas = 0
    for d in config.dados["despesas"]:
        total_despesas += d["valorCentavos"]
        linhas.append(f"despesas;{d['categoria']};{reais(d['valorCentavos'])}")
    linhas.append(f"despesas;total;{reais(total_despesas)}")
    saldo = config.dados["fundoDeReservaSaldoAnteriorCentavos"]
    linhas.append(f"fundo;saldo anterior;{reais(saldo)}")
    linhas.append(f"fundo;saldo previsto;{reais(saldo + fundo)}")
    return "\n".join(linhas) + "\n"
