# Raiz de composição: o único lugar que escolhe os adaptadores e os liga ao núcleo.
import json
import os
from pathlib import Path

import psycopg

from morada.adaptadores.saida.em_memoria import AgendasEmMemoria
from morada.adaptadores.saida.postgres import AgendasNoPostgres
from morada.aplicacao.servico_de_reservas import ServicoDeReservas
from morada.dominio.agenda import Espaco


def montar(repositorio: str, preparar: bool = False):
    dados = json.loads(Path("/dados/entrada/espacos.json").read_text("utf-8"))
    espacos = [
        Espaco(e["id"], e["taxaCentavos"], e["antecedenciaMinimaDias"])
        for e in dados["espacos"]
    ]
    if repositorio == "memoria":
        agendas = AgendasEmMemoria(espacos)
        return ServicoDeReservas(agendas), agendas
    banco = psycopg.connect(os.environ["BANCO_URL"], autocommit=True)
    agendas = AgendasNoPostgres(banco, espacos)
    if preparar:
        agendas.preparar()
    return ServicoDeReservas(agendas), agendas
