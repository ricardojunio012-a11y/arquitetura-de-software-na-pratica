# Serviços do financeiro: calcula as cobranças e monta as saídas.
from morada.antes.config.config import config
from morada.antes.util.util import competencia, dias_de_atraso, reais

# Lista interna, mas pública: qualquer um pode ler e alterar
cobrancas = []


def juros_de_mora(valor, vencimento):
    return (valor * dias_de_atraso(vencimento) + 1500) // 3000


def calcular_todas():
    despesas = config.dados["condominio"]["despesasDoMesCentavos"]
    for u in config.dados["unidades"]:
        taxa = (despesas * u["fracaoMilionesimos"] + 500000) // 1000000
        fundo = (taxa * config.fundo_porcento + 50) // 100
        d = u["debitoAnterior"]
        debito = d["valorCentavos"] if d else 0
        multa = (debito * config.multa_porcento + 50) // 100 if d else 0
        juros = juros_de_mora(debito, d["vencimento"]) if d else 0
        total = taxa + fundo + debito + multa + juros
        cobrancas.append(
            dict(
                unidade=u,
                taxa=taxa,
                fundo=fundo,
                debito=debito,
                multa=multa,
                juros=juros,
                total=total,
            )
        )


# Um parâmetro decide o que a função faz (acoplamento de controle)
def gerar_saida(tipo):
    if tipo != "cobrancas":
        return gerar_relatorio(tipo)
    linhas = [f"# Cobranças {competencia()} - {config.dados['condominio']['nome']}"]
    linhas.append("unidade;morador;taxa;fundo;debito;multa;juros;total")
    for c in cobrancas:
        campos = ("taxa", "fundo", "debito", "multa", "juros", "total")
        valores = [reais(c[k]) for k in campos]
        linhas.append(
            ";".join([c["unidade"]["id"], c["unidade"]["morador"]["nome"], *valores])
        )
    return "\n".join(linhas) + "\n"


# O ciclo com relatorios obriga a importar no fim do arquivo
from morada.antes.relatorios.relatorios import gerar_relatorio  # noqa: E402
