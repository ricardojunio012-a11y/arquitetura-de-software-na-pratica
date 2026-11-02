# Relatório de inadimplência: lê as cobranças, nunca as altera.
from datetime import date

from morada.depois.cobranca import Cobranca
from morada.depois.compartilhado.datas import rotulo_do_mes
from morada.depois.compartilhado.dinheiro import reais


def relatorio_de_inadimplencia(
    condominio: str, hoje: date, cobrancas: tuple[Cobranca, ...]
) -> str:
    devedores = sorted(
        (c for c in cobrancas if c.debito > 0), key=lambda c: c.debito, reverse=True
    )
    linhas = [f"# Inadimplência {rotulo_do_mes(hoje)} - {condominio}"]
    linhas.append("unidade;morador;dias;debito;multa;juros;atualizado")
    soma = [0, 0, 0, 0]
    for c in devedores:
        valores = [c.debito, c.multa, c.juros, c.debito + c.multa + c.juros]
        soma = [s + v for s, v in zip(soma, valores)]
        linhas.append(
            ";".join(
                [c.unidade, c.morador, str(c.dias_de_atraso)]
                + [reais(v) for v in valores]
            )
        )
    linhas.append(";".join(["total", "", ""] + [reais(s) for s in soma]))
    return "\n".join(linhas) + "\n"
