# Regras de cálculo da taxa condominial: não lê arquivo nem envia nada.
from dataclasses import dataclass
from datetime import date

from morada.etapa4.competencia import dias_desde
from morada.etapa4.dinheiro import parte_de, percentual

FUNDO_DE_RESERVA = 10  # % sobre a taxa
MULTA = 2  # % sobre o débito (limite do Código Civil, art. 1.336)
DESCONTO_PONTUALIDADE = 5  # % sobre a taxa, se não houver débito


@dataclass(frozen=True)
class Cobranca:
    unidade: dict
    taxa: int
    fundo: int
    debito: int
    multa: int
    juros: int
    total: int
    total_ate_05: (
        int | None
    )  # valor com desconto de pontualidade, se a unidade tiver direito


# 1% ao mês, proporcional aos dias de atraso
def juros_de_mora(centavos: int, dias: int) -> int:
    return (centavos * dias + 1500) // 3000


def calcular_cobranca(despesas_centavos: int, unidade: dict, hoje: date) -> Cobranca:
    taxa = parte_de(despesas_centavos, unidade["fracaoMilionesimos"])
    fundo = percentual(taxa, FUNDO_DE_RESERVA)
    debito = multa = juros = 0
    if unidade["debitoAnterior"]:
        debito = unidade["debitoAnterior"]["valorCentavos"]
        multa = percentual(debito, MULTA)
        juros = juros_de_mora(
            debito, dias_desde(unidade["debitoAnterior"]["vencimento"], hoje)
        )
    total = taxa + fundo + debito + multa + juros
    total_ate_05 = (
        total - percentual(taxa, DESCONTO_PONTUALIDADE) if debito == 0 else None
    )
    return Cobranca(unidade, taxa, fundo, debito, multa, juros, total, total_ate_05)
