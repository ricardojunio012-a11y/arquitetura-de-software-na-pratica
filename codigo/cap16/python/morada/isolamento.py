# A versão "isolamento": duas saídas do fundo de reserva, intercaladas sempre na mesma
# ordem, em três níveis de isolamento. Cada transação confere o saldo antes de
# registrar a sua saída, e mesmo assim o saldo pode ficar negativo.
import os
import sys
from pathlib import Path

import psycopg

from morada.banco import conectar, recriar_esquema
from morada.fundo import inserir_saida, preparar_fundo, reais, saldo
from morada.migracoes import aplicar_migracoes

dados = Path(sys.argv[1])
url = os.environ["BANCO_URL"]
banco = conectar(url)
recriar_esquema(banco)
aplicar_migracoes(banco, str(dados / "migracoes"))

registro: list[str] = []


# Uma saída inteira, sem intercalação: usada na nova tentativa
def tentar_de_novo(t: psycopg.Connection, nivel: str, valor: int, motivo: str):
    t.execute(f"BEGIN ISOLATION LEVEL {nivel}")
    lido = saldo(t, 1)
    registro.append(f"T2 lê o saldo: {reais(lido)}")
    if lido < valor:
        registro.append(f"T2 recusa a saída de {reais(valor)}: saldo insuficiente")
        t.execute("ROLLBACK")
        return
    inserir_saida(t, 1, valor, motivo)
    t.execute("COMMIT")
    registro.append(f"T2 registra a saída de {reais(valor)} e confirma")


for nivel in ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]:
    registro.append(f"== {nivel}")
    preparar_fundo(banco)
    t1 = conectar(url)
    t2 = conectar(url)
    t1.execute(f"BEGIN ISOLATION LEVEL {nivel}")
    t2.execute(f"BEGIN ISOLATION LEVEL {nivel}")
    registro.append("T1 e T2 começam")
    lido1 = saldo(t1, 1)
    registro.append(f"T1 lê o saldo: {reais(lido1)}")
    lido2 = saldo(t2, 1)
    registro.append(f"T2 lê o saldo: {reais(lido2)}")
    if lido1 >= 70000:
        inserir_saida(t1, 1, 70000, "conserto do portão")
        registro.append(f"T1 registra a saída de {reais(70000)}")
    if lido2 >= 60000:
        inserir_saida(t2, 1, 60000, "pintura da fachada")
        registro.append(f"T2 registra a saída de {reais(60000)}")
    t1.execute("COMMIT")
    registro.append("T1 confirma")
    try:
        t2.execute("COMMIT")
        registro.append("T2 confirma")
    except psycopg.errors.SerializationFailure:
        registro.append("T2 não confirma: falha de serialização; tenta de novo")
        t2.execute("ROLLBACK")
        tentar_de_novo(t2, nivel, 60000, "pintura da fachada")
    t1.close()
    t2.close()
    final = saldo(banco, 1)
    aviso = " (negativo: a regra foi violada)" if final < 0 else ""
    registro += [f"saldo final: {reais(final)}{aviso}", ""]
banco.close()

saida = dados / "saida" / "isolamento"
saida.mkdir(parents=True, exist_ok=True)
(saida / "execucao.txt").write_text("\n".join(registro), encoding="utf-8")
print("isolamento: três níveis executados")
