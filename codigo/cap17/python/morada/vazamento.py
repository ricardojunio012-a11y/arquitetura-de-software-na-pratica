# A versão "vazamento": o síndico do condomínio 12 abre o relatório de inadimplentes,
# primeiro sem RLS e depois com RLS. Depois, a administradora 3, que administra os
# condomínios 12 e 15, abre o mesmo relatório. A consulta com defeito é a mesma em
# todos os casos.
import os
import sys
from pathlib import Path

import psycopg

from morada.banco import como_administradora, como_condominio, conectar
from morada.relatorio import inadimplentes

dados = Path(sys.argv[1])


def sql(arquivo: str) -> str:
    return (dados / "sql" / arquivo).read_text(encoding="utf-8")


admin = conectar(os.environ["BANCO_URL"])
admin.execute(sql("esquema.sql"))
app = conectar(os.environ["APP_BANCO_URL"])
SINDICO = 12
ADMINISTRADORA = 3  # administra os condomínios 12 e 15

registro: list[str] = []


def mostrar(
    passo: int, titulo: str, linhas: list[tuple], permitidos: tuple = (SINDICO,)
) -> None:
    registro.append(f"{passo}. {titulo}")
    for condominio, unidade, morador, valor in linhas:
        alerta = "" if condominio in permitidos else "  <- outro condomínio"
        registro.append(
            f"   condomínio {condominio} | unidade {unidade} | {morador} | "
            f"{valor} centavos{alerta}"
        )
    if not linhas:
        registro.append("   nenhuma linha")
    vazadas = sum(1 for linha in linhas if linha[0] not in permitidos)
    registro.extend([f"   linhas de outros condomínios: {vazadas}", ""])


mostrar(
    1,
    "relatório do síndico do condomínio 12, sem RLS",
    como_condominio(app, SINDICO, lambda: inadimplentes(app)),
)
admin.execute(sql("rls.sql"))
mostrar(
    2,
    "o mesmo relatório, com RLS",
    como_condominio(app, SINDICO, lambda: inadimplentes(app)),
)
mostrar(
    3,
    "com RLS, numa transação sem condomínio definido",
    como_condominio(app, None, lambda: inadimplentes(app)),
)

registro.append("4. com RLS, o condomínio 12 tenta gravar uma cobrança do 15")
try:
    como_condominio(
        app,
        SINDICO,
        lambda: app.execute(
            "INSERT INTO cobrancas "
            "(condominio_id, unidade, morador, valor_centavos, situacao) "
            "VALUES (15, '13', 'Hugo Dias', 38000, 'aberta')"
        ),
    )
    registro.append("   gravada")
except psycopg.errors.InsufficientPrivilege:
    registro.append("   recusada pelo banco: a linha não passa na política de RLS")

mostrar(
    5,
    "com RLS, a administradora 3, que administra os condomínios 12 e 15",
    como_administradora(app, ADMINISTRADORA, lambda: inadimplentes(app)),
    (12, 15),
)
registro.append("6. com RLS, a administradora 3 tenta gravar uma cobrança do 20")
try:
    como_administradora(
        app,
        ADMINISTRADORA,
        lambda: app.execute(
            "INSERT INTO cobrancas "
            "(condominio_id, unidade, morador, valor_centavos, situacao) "
            "VALUES (20, 'A-5', 'Hugo Dias', 61000, 'aberta')"
        ),
    )
    registro.append("   gravada")
except psycopg.errors.InsufficientPrivilege:
    registro.append("   recusada pelo banco: a linha não passa em nenhuma política")
admin.close()
app.close()

saida = dados / "saida" / "vazamento"
saida.mkdir(parents=True, exist_ok=True)
(saida / "relatorio.txt").write_text("\n".join(registro) + "\n", encoding="utf-8")
print("vazamento: seis passos executados")
