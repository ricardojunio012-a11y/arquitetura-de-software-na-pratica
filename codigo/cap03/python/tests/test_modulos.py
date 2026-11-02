# Testes: o acoplamento escondido do "antes" e o isolamento do "depois".
import json
import os
from datetime import date
from pathlib import Path

import morada.antes.servicos.servicos as servicos
from morada.antes.config.config import config
from morada.depois.cobranca import calcular_cobrancas
from morada.depois.inadimplencia import relatorio_de_inadimplencia

HOJE = date(2026, 3, 2)


def dados():
    # Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
    arquivo = "/dados/entrada/financeiro.json"
    if not os.path.exists(arquivo):
        arquivo = Path(__file__).parents[2] / "entrada" / "financeiro.json"
    with open(arquivo, encoding="utf-8") as f:
        return json.load(f)


def test_antes_inadimplencia_muda_a_ordem_das_cobrancas_de_outro_modulo():
    config.hoje, config.dados = HOJE, dados()
    servicos.calcular_todas()
    ordem_original = [c["unidade"]["id"] for c in servicos.cobrancas]
    servicos.gerar_saida("inadimplencia")
    assert [c["unidade"]["id"] for c in servicos.cobrancas] != ordem_original


def test_depois_inadimplencia_nao_altera_as_cobrancas():
    d = dados()
    lista = calcular_cobrancas(
        d["condominio"]["despesasDoMesCentavos"], d["unidades"], HOJE
    )
    antes = [c.unidade for c in lista]
    relatorio_de_inadimplencia("Teste", HOJE, lista)
    assert [c.unidade for c in lista] == antes


def test_depois_calcula_encargos_sem_configuracao_global():
    (carla,) = calcular_cobrancas(485000, [dados()["unidades"][2]], HOJE)
    assert (carla.dias_de_atraso, carla.multa, carla.juros) == (20, 1335, 445)
