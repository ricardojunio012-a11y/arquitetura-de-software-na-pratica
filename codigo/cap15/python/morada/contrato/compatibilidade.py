# Compara o contrato publicado com uma proposta e lista as mudanças. Incompatível é o
# que pode quebrar um cliente que já funciona: tirar algo que ele usa, mudar o que ele
# recebe ou exigir algo que ele não envia.
from dataclasses import dataclass

from morada.contrato.openapi import resolver


@dataclass
class Mudanca:
    compativel: bool
    texto: str


def tipo_texto(esquema: dict) -> str:
    tipo = esquema.get("type")
    return " ou ".join(tipo) if isinstance(tipo, list) else str(tipo)


class Comparacao:
    def __init__(self, antigo: dict, novo: dict):
        self.antigo = antigo
        self.novo = novo
        self.mudancas: list[Mudanca] = []

    def anotar(self, compativel: bool, texto: str) -> None:
        self.mudancas.append(Mudanca(compativel, texto))

    def esquemas(self, a: dict, b: dict, lado: str, rotulo: str, campo: str) -> None:
        a = resolver(self.antigo, a)
        b = resolver(self.novo, b)
        nome = campo or "(raiz)"
        if tipo_texto(a) != tipo_texto(b):
            mudou = f"{nome} ({tipo_texto(a)} → {tipo_texto(b)})"
            return self.anotar(False, f"{rotulo}: tipo mudou: {mudou}")
        if "enum" in a and "enum" in b:
            # Valor novo na resposta quebra quem trata todos os casos; valor a menos
            # no pedido quebra quem o envia
            if lado == "resposta":
                de, para, aviso = a["enum"], b["enum"], "valor novo no enum"
            else:
                de, para, aviso = b["enum"], a["enum"], "valor removido do enum"
            for valor in para:
                if valor not in de:
                    self.anotar(False, f"{rotulo}: {aviso}: {nome} = {valor}")
        props_a = a.get("properties", {})
        props_b = b.get("properties", {})
        obrig_a = a.get("required", [])
        obrig_b = b.get("required", [])

        def dentro(p: str) -> str:
            return f"{campo}.{p}" if campo else p

        for p in props_a:
            if p not in props_b:
                self.anotar(False, f"{rotulo}: campo removido: {dentro(p)}")
                continue
            if lado == "resposta" and p in obrig_a and p not in obrig_b:
                self.anotar(
                    False, f"{rotulo}: campo deixou de ser garantido: {dentro(p)}"
                )
            if lado == "pedido" and p not in obrig_a and p in obrig_b:
                self.anotar(
                    False, f"{rotulo}: campo passou a ser obrigatório: {dentro(p)}"
                )
            self.esquemas(props_a[p], props_b[p], lado, rotulo, dentro(p))
        for p in props_b:
            if p in props_a:
                continue
            if lado == "resposta":
                self.anotar(True, f"{rotulo}: campo novo: {dentro(p)}")
            elif p in obrig_b:
                self.anotar(False, f"{rotulo}: campo novo obrigatório: {dentro(p)}")
            else:
                self.anotar(True, f"{rotulo}: campo novo opcional: {dentro(p)}")
        if "items" in a and "items" in b:
            self.esquemas(a["items"], b["items"], lado, rotulo, f"{campo}[]")

    def parametros(self, a: list, b: list, nome: str) -> None:
        def chave(p: dict) -> str:
            return f"{p['in']} {p['name']}"

        novos = {chave(p): p for p in b}
        for pa in a:
            pb = novos.get(chave(pa))
            if pb is None:
                self.anotar(False, f"{nome}: parâmetro removido: {pa['name']}")
                continue
            if not pa.get("required") and pb.get("required"):
                texto = f"parâmetro passou a ser obrigatório: {pa['name']}"
                self.anotar(False, f"{nome}: {texto}")
            rotulo = f"{nome} parâmetro {pa['name']}"
            self.esquemas(pa["schema"], pb["schema"], "pedido", rotulo, "")
        antigos = {chave(p) for p in a}
        for pb in b:
            if chave(pb) in antigos:
                continue
            if pb.get("required"):
                texto = f"parâmetro obrigatório novo: {pb['name']}"
                self.anotar(False, f"{nome}: {texto}")
            else:
                self.anotar(True, f"{nome}: parâmetro opcional novo: {pb['name']}")

    def operacao(self, a: dict, b: dict, nome: str) -> None:
        self.parametros(a.get("parameters", []), b.get("parameters", []), nome)

        def pedido(op: dict):
            conteudo = op.get("requestBody", {}).get("content", {})
            return conteudo.get("application/json", {}).get("schema")

        if pedido(a) and pedido(b):
            self.esquemas(pedido(a), pedido(b), "pedido", f"{nome} pedido", "")
        for status, resposta_a in a["responses"].items():
            if status not in b["responses"]:
                continue
            conteudo_a = resolver(self.antigo, resposta_a).get("content", {})
            conteudo_b = resolver(self.novo, b["responses"][status]).get("content", {})
            for tipo, meio in conteudo_a.items():
                if tipo not in conteudo_b:
                    continue
                esquema_b = conteudo_b[tipo]["schema"]
                self.esquemas(
                    meio["schema"], esquema_b, "resposta", f"{nome} {status}", ""
                )


def comparar_contratos(antigo: dict, novo: dict) -> list[Mudanca]:
    c = Comparacao(antigo, novo)
    for caminho, operacoes in antigo["paths"].items():
        for metodo, op in operacoes.items():
            nome = f"{metodo.upper()} {caminho}"
            op_nova = novo["paths"].get(caminho, {}).get(metodo)
            if op_nova:
                c.operacao(op, op_nova, nome)
            else:
                c.anotar(False, f"{nome}: operação removida")
    for caminho, operacoes in novo["paths"].items():
        for metodo in operacoes:
            if metodo not in antigo["paths"].get(caminho, {}):
                c.anotar(True, f"{metodo.upper()} {caminho}: operação nova")
    return c.mudancas
