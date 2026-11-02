# O mês de referência da cobrança e as datas que dependem dele.
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Competencia:
    hoje: date
    rotulo: str  # "03/2026"
    codigo: str  # "202603"
    vencimento: str  # "10/03/2026"
    limite_desconto: str  # "05/03/2026"


def competencia_de(hoje: date) -> Competencia:
    mes = f"{hoje.month:02d}"
    return Competencia(
        hoje,
        f"{mes}/{hoje.year}",
        f"{hoje.year}{mes}",
        f"10/{mes}/{hoje.year}",
        f"05/{mes}/{hoje.year}",
    )


# Dias corridos entre uma data (AAAA-MM-DD) e hoje
def dias_desde(data_iso: str, hoje: date) -> int:
    return (hoje - date.fromisoformat(data_iso)).days
