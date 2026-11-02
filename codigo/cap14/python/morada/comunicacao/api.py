# A API HTTP do serviço de Comunicação: o provedor do contrato.
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from morada.comunicacao.dominio import Comunicacao, DadosInvalidosErro


def responder(tratador: BaseHTTPRequestHandler, status: int, corpo: dict) -> None:
    dados = json.dumps(corpo, ensure_ascii=False).encode()
    tratador.send_response(status)
    tratador.send_header("Content-Type", "application/json")
    tratador.send_header("Content-Length", str(len(dados)))
    tratador.end_headers()
    tratador.wfile.write(dados)


def criar_api(comunicacao: Comunicacao) -> HTTPServer:
    class Tratador(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/avisos":
                return responder(self, 404, {"erro": "não encontrado"})
            aviso = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            try:
                situacao = comunicacao.avisar(aviso["id"], aviso["texto"])
                responder(self, 200, {"aviso": aviso["id"], "situacao": situacao})
            except DadosInvalidosErro as erro:
                responder(self, 400, {"erro": str(erro)})

        def log_message(self, *args):
            pass

    return HTTPServer(("127.0.0.1", 0), Tratador)


# Sobe o servidor numa thread e devolve o endereço
def subir(servidor: HTTPServer) -> str:
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{servidor.server_address[1]}"
