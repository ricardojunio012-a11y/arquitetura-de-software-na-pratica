# Verificação do contrato do lado do provedor. Lê o contrato publicado pelo
# consumidor, prepara o estado pedido em cada interação, envia o pedido à API real
# da Comunicação e compara a resposta com a combinada.
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from morada.comunicacao.api import criar_api, subir
from morada.comunicacao.dominio import AvisosEmMemoria, Comunicacao

saida = Path(sys.argv[1])
contrato = json.loads((saida / "consumidor" / "contrato.json").read_text("utf-8"))

# Cada estado do contrato tem uma preparação do lado do provedor
estados = {
    "nenhum aviso foi enviado": lambda c: None,
    "o aviso E-P-001 já foi enviado": lambda c: c.avisar(
        "E-P-001", "pagamento recebido"
    ),
}


def enviar(url: str, requisicao: dict) -> dict:
    pedido = urllib.request.Request(
        url + requisicao["caminho"],
        data=json.dumps(requisicao["corpo"]).encode(),
        headers={"Content-Type": "application/json"},
        method=requisicao["metodo"],
    )
    try:
        with urllib.request.urlopen(pedido) as resposta:
            return {"status": resposta.status, "corpo": json.loads(resposta.read())}
    except urllib.error.HTTPError as erro:
        return {"status": erro.code, "corpo": json.loads(erro.read())}


# A resposta cumpre o contrato se tem o status combinado e os campos que o
# consumidor declarou. Campos a mais não quebram ninguém.
def cumpre(obtido: dict, esperado: dict) -> bool:
    corpo = obtido["corpo"]
    return obtido["status"] == esperado["status"] and all(
        corpo.get(campo) == valor for campo, valor in esperado["corpo"].items()
    )


relatorio = []
for interacao in contrato["interacoes"]:
    comunicacao = Comunicacao(AvisosEmMemoria())
    estados[interacao["estado"]](comunicacao)
    api = criar_api(comunicacao)
    obtido = enviar(subir(api), interacao["requisicao"])
    api.shutdown()
    if cumpre(obtido, interacao["resposta"]):
        relatorio.append(f"{interacao['descricao']}: verificada")
    else:
        esperado = json.dumps(interacao["resposta"], ensure_ascii=False)
        recebido = json.dumps(obtido, ensure_ascii=False)
        falha = f"FALHOU (esperado {esperado}, recebido {recebido})"
        relatorio.append(f"{interacao['descricao']}: {falha}")

(saida / "provedor").mkdir(parents=True, exist_ok=True)
(saida / "provedor" / "relatorio.txt").write_text(
    "\n".join(relatorio) + "\n", encoding="utf-8"
)
print(f"provedor: {len(relatorio)} interações verificadas")
sys.exit(1 if any("FALHOU" in linha for linha in relatorio) else 0)
