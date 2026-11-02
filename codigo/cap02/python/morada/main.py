# Uso: python -m morada.main <cenarios.json>
# Roda cada cenário, imprime o relatório e termina com erro se algum falhar.
import json
import sys
from datetime import date

from morada.cenarios import executar


def numero(n: float) -> str:
    return f"{round(n):,}".replace(",", ".")


def decimal(n: float, casas: int) -> str:
    return f"{n:.{casas}f}".replace(".", ",")


# 2,25 s | 4 min | 6 h 40 min
def duracao(segundos: float) -> str:
    if segundos < 60:
        return f"{decimal(segundos, 2)} s"
    minutos = round(segundos / 60)
    h = minutos // 60
    if h == 0:
        return f"{minutos} min"
    return f"{h} h" if minutos % 60 == 0 else f"{h} h {minutos % 60} min"


with open(sys.argv[1], encoding="utf-8") as f:
    cenarios = json.load(f)
hoje = date(2026, 3, 2)
falhas = 0

for c in cenarios:
    r = executar(c, hoje)
    if not r.passou:
        falhas += 1
    vazao = r.cobrancas / r.segundos_calculo
    print(f"{c['id']}: {c['descricao']}")
    print(
        f"  cobranças: {numero(r.cobrancas)}  "
        f"meta: até {duracao(c['limiteSegundos'])}"
    )
    print(
        f"  cálculo (medido): {duracao(r.segundos_calculo)}, "
        f"{numero(vazao)} por segundo"
    )
    print(
        f"  registro no banco (estimado, {c['registrosPorSegundo']}/s): "
        f"{duracao(r.segundos_registro)}"
    )
    print(
        f"  avisos: {decimal(r.bytes_avisos / 1e6, 1)} MB, "
        f"{numero(r.bytes_avisos / r.cobrancas)} bytes por aviso"
    )
    print(f"  resultado: {'PASSOU' if r.passou else 'FALHOU'}")
print(f"{len(cenarios) - falhas} de {len(cenarios)} cenários dentro da meta.")
sys.exit(1 if falhas else 0)
