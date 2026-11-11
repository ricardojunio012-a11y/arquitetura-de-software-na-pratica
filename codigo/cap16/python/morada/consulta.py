# A versão "consulta": a consulta de inadimplência sobre 1 milhão de cobranças, sem
# índice, com um índice na coluna errada e com o índice certo, criado pela migração
# 003. Os planos vão para saida/consulta; os tempos, que variam, só para o terminal.
import os
import sys
from pathlib import Path

from morada.banco import conectar, recriar_esquema
from morada.migracoes import aplicar_migracoes

dados = Path(sys.argv[1])
pasta_migracoes = str(dados / "migracoes")
banco = conectar(os.environ["BANCO_URL"])
recriar_esquema(banco)
aplicadas = aplicar_migracoes(banco, pasta_migracoes, ate=2)
banco.execute((dados / "entrada" / "cobrancas.sql").read_text(encoding="utf-8"))
banco.execute("ANALYZE cobrancas")
# Sem paralelismo, o plano fica igual em qualquer máquina e mais fácil de ler
banco.execute("SET max_parallel_workers_per_gather = 0")
consulta = (dados / "entrada" / "inadimplencia.sql").read_text(encoding="utf-8")


# Os nós que leem dados (varreduras de tabela e de índice), do plano em JSON
def varreduras(no: dict) -> list[str]:
    filhos = [linha for filho in no.get("Plans", []) for linha in varreduras(filho)]
    if "Relation Name" not in no and "Index Name" not in no:
        return filhos
    tabela = f" em {no['Relation Name']}" if "Relation Name" in no else ""
    indice = f" pelo índice {no['Index Name']}" if "Index Name" in no else ""
    descartadas = no.get("Rows Removed by Filter", 0)
    linhas = f"{no['Actual Rows']} linhas aproveitadas, {descartadas} descartadas"
    return [f"{no['Node Type']}{tabela}{indice}: {linhas}", *filhos]


planos: list[str] = []


def planejar(titulo: str) -> None:
    ((plano,),) = banco.execute(f"EXPLAIN (ANALYZE, FORMAT JSON) {consulta}").fetchone()
    planos.append(f"{len(planos) // 3 + 1}. {titulo}")
    planos.extend(f"   {linha}" for linha in varreduras(plano["Plan"]))
    planos.append("")
    print(f"{titulo}: {plano['Execution Time']:.1f} ms")


planejar("sem índice")
banco.execute("CREATE INDEX cobrancas_vencimento ON cobrancas (vencimento)")
banco.execute("ANALYZE cobrancas")
planejar("índice só no vencimento")
banco.execute("DROP INDEX cobrancas_vencimento")
aplicadas += aplicar_migracoes(banco, pasta_migracoes)
banco.execute("ANALYZE cobrancas")
planejar("índice da migração 003")

resultado = [
    f"unidade {unidade}: cobranças em aberto {quantas}, total {total} centavos"
    for unidade, quantas, total in banco.execute(consulta)
]
banco.close()

saida = dados / "saida" / "consulta"
saida.mkdir(parents=True, exist_ok=True)
(saida / "planos.txt").write_text("\n".join(planos), encoding="utf-8")
(saida / "resultado.txt").write_text("\n".join(resultado) + "\n", encoding="utf-8")
(saida / "migracoes.txt").write_text("\n".join(aplicadas) + "\n", encoding="utf-8")
