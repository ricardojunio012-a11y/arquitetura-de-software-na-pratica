# Adaptador de entrada HTTP: traduz requisições em chamadas à porta de entrada e
# erros em códigos de status. Só ele conhece o FastAPI.
from fastapi import Body, FastAPI, Request
from fastapi.responses import JSONResponse

from morada.aplicacao.portas import CasosDeUsoDeReservas
from morada.dominio.agenda import NaoEncontradoErro, RegraVioladaErro

OBRIGATORIOS = ["reserva", "unidade", "espaco", "data", "inicio", "fim", "em"]


class DadosInvalidosErro(Exception):
    pass


def criar_api(reservas: CasosDeUsoDeReservas) -> FastAPI:
    app = FastAPI()

    @app.get("/espacos")
    def listar_espacos():
        return reservas.listar_espacos()

    @app.post("/reservas", status_code=201)
    def reservar(corpo: dict = Body(default={})):
        faltando = [campo for campo in OBRIGATORIOS if campo not in corpo]
        if faltando:
            raise DadosInvalidosErro(f"campo obrigatório: {faltando[0]}")
        return reservas.reservar(corpo)

    @app.delete("/reservas/{id}")
    def cancelar(id: str, em: str = ""):
        return reservas.cancelar(id, em)

    @app.get("/espacos/{id}/reservas")
    def reservas_do_espaco(id: str):
        return reservas.reservas_do_espaco(id)

    for erro, status in [
        (DadosInvalidosErro, 400),
        (NaoEncontradoErro, 404),
        (RegraVioladaErro, 409),
    ]:

        def tratar(_req: Request, e: Exception, status=status):
            return JSONResponse({"erro": str(e)}, status_code=status)

        app.add_exception_handler(erro, tratar)
    return app
