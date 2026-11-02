# O serviço de Comunicação: o mesmo módulo, agora atrás de uma API HTTP, num
# processo e num contêiner próprios. Com FALHAS=sim, falha de propósito: a cada 25
# chamadas recusa o pedido, e a cada 40 envia o aviso mas "perde" a resposta.
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from morada.comunicacao import Comunicacao

FALHAR = os.environ.get("FALHAS") == "sim"
estado = {"comunicacao": Comunicacao(), "chamadas": 0}


class Tratador(BaseHTTPRequestHandler):
    def responder(self, status: int, corpo: dict) -> None:
        dados = json.dumps(corpo, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def do_GET(self):
        if self.path == "/saude":
            return self.responder(200, {})
        self.responder(404, {"erro": "não encontrado"})

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length", 0))
        corpo = self.rfile.read(tamanho)
        # Só para o laboratório: começa cada execução do zero
        if self.path == "/reiniciar":
            estado.update(comunicacao=Comunicacao(), chamadas=0)
            return self.responder(200, {})
        if self.path != "/avisos":
            return self.responder(404, {"erro": "não encontrado"})
        aviso = json.loads(corpo)
        estado["chamadas"] += 1
        if FALHAR and estado["chamadas"] % 25 == 0:
            return self.responder(503, {"erro": "indisponível"})
        enviado = estado["comunicacao"].avisar(aviso["id"], aviso["texto"])
        if FALHAR and estado["chamadas"] % 40 == 0:
            return self.responder(503, {"erro": "tempo esgotado"})
        situacao = "enviado" if enviado else "repetido"
        self.responder(200, {"aviso": aviso["id"], "situacao": situacao})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Comunicação ouvindo na porta 8080", flush=True)
    HTTPServer(("0.0.0.0", 8080), Tratador).serve_forever()
