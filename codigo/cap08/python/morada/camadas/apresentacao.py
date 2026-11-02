# Camada de apresentação: traduz HTTP em chamadas à aplicação e erros em
# códigos de status. É a única camada que conhece o FastAPI.
from fastapi import Body, FastAPI, Request
from fastapi.responses import JSONResponse

from morada.camadas.aplicacao import ServicoDeReservas
from morada.camadas.dominio import NaoEncontradoErro, RegraVioladaErro

OBRIGATORIOS = ["reserva", "unidade", "espaco", "data", "inicio", "fim", "em"]


class DadosInvalidosErro(Exception):
    pass


def criar_api(servico: ServicoDeReservas) -> FastAPI:
    app = FastAPI()

    @app.get("/espacos")
    def listar_espacos():
        return servico.listar_espacos()

    @app.post("/reservas", status_code=201)
    def reservar(corpo: dict = Body(default={})):
        faltando = [campo for campo in OBRIGATORIOS if campo not in corpo]
        if faltando:
            raise DadosInvalidosErro(f"campo obrigatório: {faltando[0]}")
        return servico.reservar(corpo)

    @app.delete("/reservas/{id}")
    def cancelar(id: str, em: str = ""):
        return servico.cancelar(id, em)

    @app.get("/espacos/{id}/reservas")
    def reservas_do_espaco(id: str):
        return servico.reservas_do_espaco(id)

    # Cada tipo de erro vira um código de status; o domínio não sabe disso
    for erro, status in [
        (DadosInvalidosErro, 400),
        (NaoEncontradoErro, 404),
        (RegraVioladaErro, 409),
    ]:

        def tratar(_req: Request, e: Exception, status=status):
            return JSONResponse({"erro": str(e)}, status_code=status)

        app.add_exception_handler(erro, tratar)
    return app
