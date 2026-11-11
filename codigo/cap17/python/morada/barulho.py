# A versão "barulho": um servidor atende um pedido por vez, em ordem de chegada, e
# cada pedido leva servicoMs. Sem limite, a rajada de um condomínio enche a fila e
# atrasa todos. Com um balde de fichas por condomínio, a rajada é recusada (429) e os
# outros quase não esperam. O tempo é simulado, e o resultado é sempre o mesmo.
import json
import sys
from pathlib import Path

from morada.balde import BaldeDeFichas

dados = Path(sys.argv[1])
cenario = json.loads((dados / "entrada" / "barulho.json").read_text("utf-8"))

pedidos = sorted(
    (t, c["condominio"])
    for c in cenario["clientes"]
    for t in range(c["inicioMs"], cenario["duracaoMs"], c["intervaloMs"])
)


def simular(limite: dict | None) -> list[str]:
    recusados: dict[int, int] = {}
    esperas: dict[int, list[int]] = {}
    baldes: dict[int, BaldeDeFichas] = {}
    livre_em = 0
    for t, condominio in pedidos:
        recusados.setdefault(condominio, 0)
        esperas.setdefault(condominio, [])
        if limite:
            balde = baldes.setdefault(
                condominio, BaldeDeFichas(limite["rajada"], limite["porSegundo"])
            )
            if not balde.permite(t):
                recusados[condominio] += 1
                continue
        # O pedido espera o servidor terminar o que chegou antes dele
        inicio = max(t, livre_em)
        esperas[condominio].append(inicio - t)
        livre_em = inicio + cenario["servicoMs"]
    linhas = []
    for condominio in sorted(esperas):
        lista = esperas[condominio]
        media = sum(lista) // len(lista) if lista else 0
        maxima = max(lista) if lista else 0
        linhas.append(
            f"condomínio {condominio}: {len(lista) + recusados[condominio]} pedidos, "
            f"{len(lista)} atendidos, {recusados[condominio]} recusados, "
            f"espera média {media} ms, máxima {maxima} ms"
        )
    return linhas


limite = cenario["limite"]
resultado = [
    "== sem limite",
    *simular(None),
    "",
    f"== com limite por condomínio (rajada de {limite['rajada']}, "
    f"{limite['porSegundo']} por segundo)",
    *simular(limite),
]

saida = dados / "saida" / "barulho"
saida.mkdir(parents=True, exist_ok=True)
(saida / "resultado.txt").write_text("\n".join(resultado) + "\n", encoding="utf-8")
print(f"barulho: {len(pedidos)} pedidos simulados")
