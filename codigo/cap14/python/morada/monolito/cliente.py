# O cliente que o monólito usa para falar com o serviço de Comunicação: o
# consumidor do contrato. Ele interpreta as respostas que o serviço promete dar.
import json
import urllib.error
import urllib.request


class ClienteComunicacao:
    def __init__(self, url: str):
        self._url = url

    def avisar(self, id: str, texto: str) -> dict:
        pedido = urllib.request.Request(
            f"{self._url}/avisos",
            data=json.dumps({"id": id, "texto": texto}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(pedido) as resposta:
                corpo = json.loads(resposta.read())
                return {"ok": True, "repetido": corpo["situacao"] == "repetido"}
        except urllib.error.HTTPError as erro:
            return {"ok": False, "erro": json.loads(erro.read())["erro"]}
