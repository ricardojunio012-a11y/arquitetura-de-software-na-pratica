# Leitura do contrato OpenAPI: resolve referências e encontra a operação de um
# pedido.
import yaml


def ler_contrato(arquivo: str) -> dict:
    with open(arquivo, encoding="utf-8") as entrada:
        return yaml.safe_load(entrada)


# Troca {"$ref": "#/components/schemas/X"} pelo objeto apontado
def resolver(contrato: dict, no):
    while isinstance(no, dict) and "$ref" in no:
        atual = contrato
        for parte in no["$ref"][2:].split("/"):
            atual = atual[parte]
        no = atual
    return no


# O modelo de caminho do contrato que casa com um caminho concreto
def encontrar_caminho(contrato: dict, caminho: str) -> str | None:
    partes = caminho.split("/")
    for modelo in contrato["paths"]:
        pedacos = modelo.split("/")
        if len(pedacos) == len(partes) and all(
            p.startswith("{") or p == parte for p, parte in zip(pedacos, partes)
        ):
            return modelo
    return None
