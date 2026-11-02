# Interface pública da cobrança: os outros módulos só importam daqui.
from dataclasses import dataclass
from datetime import date

from morada.depois.cobranca.regras import encargos, fundo_de_reserva
from morada.depois.compartilhado.datas import rotulo_do_mes
from morada.depois.compartilhado.dinheiro import parte_de, reais

__all__ = ["Cobranca", "calcular_cobrancas", "relatorio_de_cobrancas"]


@dataclass(frozen=True)
class Cobranca:
    unidade: str
    morador: str
    taxa: int
    fundo: int
    debito: int
    dias_de_atraso: int
    multa: int
    juros: int
    total: int


def calcular_cobrancas(
    despesas: int, unidades: list, hoje: date
) -> tuple[Cobranca, ...]:
    resultado = []
    for u in unidades:
        taxa = parte_de(despesas, u["fracaoMilionesimos"])
        fundo = fundo_de_reserva(taxa)
        d = u["debitoAnterior"]
        debito = d["valorCentavos"] if d else 0
        e = (
            encargos(debito, d["vencimento"], hoje)
            if d
            else {"dias": 0, "multa": 0, "juros": 0}
        )
        total = taxa + fundo + debito + e["multa"] + e["juros"]
        resultado.append(
            Cobranca(
                u["id"],
                u["morador"]["nome"],
                taxa,
                fundo,
                debito,
                e["dias"],
                e["multa"],
                e["juros"],
                total,
            )
        )
    return tuple(resultado)


def relatorio_de_cobrancas(condominio: str, hoje: date, cobrancas) -> str:
    linhas = [f"# Cobranças {rotulo_do_mes(hoje)} - {condominio}"]
    linhas.append("unidade;morador;taxa;fundo;debito;multa;juros;total")
    for c in cobrancas:
        valores = [
            reais(v) for v in (c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total)
        ]
        linhas.append(";".join([c.unidade, c.morador, *valores]))
    return "\n".join(linhas) + "\n"
