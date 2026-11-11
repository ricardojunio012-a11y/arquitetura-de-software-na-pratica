# A versão "api": prepara o banco, sobe a API, envia as requisições do roteiro e
# confere cada resposta contra o contrato openapi/v1.yaml.
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

import psycopg

from morada.api.api import criar_api, para_json, subir
from morada.api.banco import preparar_banco
from morada.contrato.openapi import ler_contrato
from morada.contrato.validar import validar_resposta

dados = Path(sys.argv[1])
saida = dados / "saida" / "api"
url_banco = os.environ["BANCO_URL"]
preparar_banco(url_banco, str(dados / "entrada" / "cobrancas.json"))
contrato = ler_contrato(str(dados / "openapi" / "v1.yaml"))
requisicoes = json.loads((dados / "entrada" / "requisicoes.json").read_text("utf-8"))
api = criar_api(url_banco)
url = subir(api)


def enviar(r: dict) -> tuple[int, str, dict]:
    cabecalhos = {"Content-Type": "application/json"}
    # Quem chama (no lugar do token de acesso) e a chave de idempotência
    if "administradora" in r:
        cabecalhos["Morada-Administradora"] = r["administradora"]
    if "chave" in r:
        cabecalhos["Idempotency-Key"] = r["chave"]
    corpo = json.dumps(r["corpo"]).encode() if "corpo" in r else None
    pedido = urllib.request.Request(
        url + r["caminho"], data=corpo, headers=cabecalhos, method=r["metodo"]
    )
    try:
        with urllib.request.urlopen(pedido) as resposta:
            tipo = resposta.headers["Content-Type"]
            return resposta.status, tipo, json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        return erro.code, erro.headers["Content-Type"], json.loads(erro.read())


respostas = []
divergencias = []
for i, r in enumerate(requisicoes, start=1):
    status, tipo, corpo = enviar(r)
    extras = []
    if "administradora" in r:
        extras.append(f"Morada-Administradora: {r['administradora']}")
    if "chave" in r:
        extras.append(f"Idempotency-Key: {r['chave']}")
    lista = f" ({', '.join(extras)})" if extras else ""
    respostas += [f"{i}. {r['descricao']}", f"   {r['metodo']} {r['caminho']}{lista}"]
    if "corpo" in r:
        respostas.append(f"   {para_json(r['corpo'])}")
    respostas += [f"   → {status} {tipo}", f"   {para_json(corpo)}", ""]
    caminho = urlsplit(r["caminho"]).path
    divergencias += validar_resposta(
        contrato, r["metodo"], caminho, status, tipo, corpo
    )
api.shutdown()

with psycopg.connect(url_banco) as banco:
    pagamentos = banco.execute(
        "SELECT id, cobranca, valor_centavos FROM pagamentos ORDER BY id"
    ).fetchall()
    pagas = banco.execute(
        "SELECT id FROM cobrancas WHERE situacao = 'paga' ORDER BY id"
    ).fetchall()
    chaves = banco.execute(
        """SELECT administradora, string_agg(chave, ', ' ORDER BY chave)
           FROM chaves_idempotencia GROUP BY administradora ORDER BY administradora"""
    ).fetchall()
estado = [f"pagamentos registrados: {len(pagamentos)}"]
estado += [
    f"  {id}: cobrança {cobranca}, {valor} centavos"
    for id, cobranca, valor in pagamentos
]
estado += [
    f"cobranças pagas: {', '.join(id for (id,) in pagas)}",
    "chaves de idempotência guardadas:",
]
estado += [f"  {administradora}: {lista}" for administradora, lista in chaves]
conferencia = [f"{len(requisicoes)} respostas conferidas com openapi/v1.yaml"]
conferencia += divergencias or ["nenhuma divergência"]

saida.mkdir(parents=True, exist_ok=True)
(saida / "respostas.txt").write_text("\n".join(respostas), encoding="utf-8")
(saida / "estado.txt").write_text("\n".join(estado) + "\n", encoding="utf-8")
(saida / "contrato.txt").write_text("\n".join(conferencia) + "\n", encoding="utf-8")
print(f"api: {len(requisicoes)} requisições, {len(divergencias)} divergências")
