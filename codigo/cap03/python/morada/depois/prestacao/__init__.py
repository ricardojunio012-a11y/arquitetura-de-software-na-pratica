# Prestação de contas: recebe só o que precisa, por parâmetro.
from datetime import date

from morada.depois.cobranca import Cobranca
from morada.depois.compartilhado.datas import rotulo_do_mes
from morada.depois.compartilhado.dinheiro import reais


def prestacao_de_contas(
    condominio: str,
    hoje: date,
    cobrancas: tuple[Cobranca, ...],
    despesas: list[dict],
    saldo_anterior_do_fundo: int,
) -> str:
    taxas = sum(c.taxa for c in cobrancas)
    fundo = sum(c.fundo for c in cobrancas)
    linhas = [f"# Prestação de contas {rotulo_do_mes(hoje)} - {condominio}"]
    linhas.append(f"receitas;taxas condominiais;{reais(taxas)}")
    linhas.append(f"receitas;fundo de reserva;{reais(fundo)}")
    for d in despesas:
        linhas.append(f"despesas;{d['categoria']};{reais(d['valorCentavos'])}")
    linhas.append(f"despesas;total;{reais(sum(d['valorCentavos'] for d in despesas))}")
    linhas.append(f"fundo;saldo anterior;{reais(saldo_anterior_do_fundo)}")
    linhas.append(f"fundo;saldo previsto;{reais(saldo_anterior_do_fundo + fundo)}")
    return "\n".join(linhas) + "\n"
