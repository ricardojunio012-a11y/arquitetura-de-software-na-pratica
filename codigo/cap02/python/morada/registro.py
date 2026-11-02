# Uso: python -m morada.registro <registro.json>
# Simula a fila de registro em lote e compara o tempo até a confirmação com a meta.
import json
import sys

from morada.fila_de_registro import disponiveis_ate, percentil, simular


def numero(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def por_cento(n: float) -> str:
    return f"{n:.2f}%".replace(".", ",")


# 10 min | 1 h 36 min | nunca
def duracao(segundos: float | None) -> str:
    if segundos is None:
        return "nunca"
    minutos = round(segundos / 60)
    h = minutos // 60
    if h == 0:
        return f"{minutos} min"
    return f"{h} h" if minutos % 60 == 0 else f"{h} h {minutos % 60} min"


with open(sys.argv[1], encoding="utf-8") as f:
    p = json.load(f)
print(f"{p['id']}: {p['descricao']} (semente {p['semente']})")
print(
    f"  premissas: {numero(p['boletos'])} boletos em arquivos de "
    f"{numero(p['boletosPorArquivo'])}, {numero(p['registrosPorSegundo'])} por segundo,"
)
print(
    f"  retorno {duracao(p['retornoSegundos'])} depois de cada arquivo, "
    f"{p['falhaPassageiraPorCento']}% de recusa passageira, "
    f"1 em {p['recusaDefinitivaACada']} definitiva"
)
print(
    f"  estimativa por divisão: {duracao(p['boletos'] / p['registrosPorSegundo'])}  "
    f"meta: todos em até {duracao(p['limiteSegundos'])}"
)
falhas = 0
for ajustada in (False, True):
    r = simular(p, ajustada)
    dentro = disponiveis_ate(r, p["limiteSegundos"])
    passou = dentro == p["boletos"]
    if not passou:
        falhas += 1

    def pct(m: int) -> str:
        return duracao(percentil(r, p["boletos"], m))

    print("ajustada:" if ajustada else "ingênua:")
    print(f"  arquivos: {r.arquivos}  tentativas de registro: {numero(r.tentativas)}")
    print(
        f"  disponível em p50: {pct(500)}  p95: {pct(950)}  "
        f"p99: {pct(990)}  p99,9: {pct(999)}"
    )
    print(
        f"  última disponível: {duracao(max(r.disponivel_em))}  sem registro: "
        f"{numero(r.sem_registro)}  com Pix: {numero(r.via_pix)}"
    )
    print(
        f"  em até {duracao(p['limiteSegundos'])}: {numero(dentro)} "
        f"({por_cento(100 * dentro / p['boletos'])})"
    )
    print(f"  resultado: {'PASSOU' if passou else 'FALHOU'}")
sys.exit(1 if falhas else 0)
