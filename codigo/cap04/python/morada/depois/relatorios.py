# Relatórios: só leem cobranças e registros. Uma regra nova aparece aqui sozinha.
from morada.compartilhado.datas import dia_mes
from morada.compartilhado.dinheiro import reais


def linha(texto, valor):
    return "  " + texto.ljust(40) + reais(valor).rjust(10)


def relatorio_de_cobrancas(titulo, cobrancas, prazos):
    linhas = [f"# Cobranças {titulo}"]
    for c in cobrancas:
        linhas += ["", f"{c.unidade} {c.morador}"]
        linhas += [linha(l.descricao, l.valor) for l in c.lancamentos]
        linhas.append(linha("Total", c.total))
        if c.desconto > 0:
            texto = f"Total com desconto até {dia_mes(prazos.desconto_ate)}"
            linhas.append(linha(texto, c.total - c.desconto))
    return "\n".join(linhas) + "\n"


def relatorio_de_registros(titulo, gateway, cobrancas, registros):
    linhas = [f"# Registros {titulo} - {gateway}"]
    linhas.append("unidade;identificador;valor;desconto")
    for r, c in zip(registros, cobrancas):
        linhas.append(
            f"{r.unidade};{r.identificador};{reais(c.total)};{reais(c.desconto)}"
        )
    return "\n".join(linhas) + "\n"
