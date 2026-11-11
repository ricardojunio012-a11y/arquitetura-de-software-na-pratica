# Confere uma resposta real contra o contrato: o status precisa estar documentado, o
# tipo de conteúdo também, e o corpo precisa seguir o esquema.
from morada.contrato.openapi import encontrar_caminho, resolver


def tipo_de(valor) -> str:
    if valor is None:
        return "null"
    if isinstance(valor, bool):
        return "boolean"
    if isinstance(valor, int):
        return "integer"
    if isinstance(valor, float):
        return "number"
    if isinstance(valor, str):
        return "string"
    if isinstance(valor, list):
        return "array"
    return "object"


def validar_esquema(contrato: dict, esquema: dict, valor, onde: str) -> list[str]:
    esquema = resolver(contrato, esquema)
    declarado = esquema.get("type")
    tipos = declarado if isinstance(declarado, list) else [declarado]
    tipo = tipo_de(valor)
    if declarado and tipo not in tipos:
        return [f"{onde}: esperado {' ou '.join(tipos)}, recebido {tipo}"]
    if "enum" in esquema and valor not in esquema["enum"]:
        return [f"{onde}: valor fora do enum: {valor}"]
    erros = []
    if tipo == "object":
        for campo in esquema.get("required", []):
            if campo not in valor:
                erros.append(f"{onde}.{campo}: campo obrigatório ausente")
        for campo, sub in esquema.get("properties", {}).items():
            if campo in valor:
                erros += validar_esquema(contrato, sub, valor[campo], f"{onde}.{campo}")
    if tipo == "array" and "items" in esquema:
        for i, item in enumerate(valor):
            erros += validar_esquema(contrato, esquema["items"], item, f"{onde}[{i}]")
    return erros


def validar_resposta(
    contrato: dict, metodo: str, caminho: str, status: int, tipo: str, corpo
) -> list[str]:
    modelo = encontrar_caminho(contrato, caminho)
    operacao = contrato["paths"][modelo].get(metodo.lower()) if modelo else None
    if not operacao:
        return [f"{metodo} {caminho}: operação fora do contrato"]
    nome = f"{metodo} {modelo} {status}"
    resposta = resolver(contrato, operacao["responses"].get(str(status)))
    if not resposta:
        return [f"{nome}: status não documentado"]
    conteudo = resposta.get("content", {}).get(tipo)
    if not conteudo:
        return [f"{nome}: tipo de conteúdo não documentado: {tipo}"]
    erros = validar_esquema(contrato, conteudo["schema"], corpo, "$")
    return [f"{nome}: {erro}" for erro in erros]
