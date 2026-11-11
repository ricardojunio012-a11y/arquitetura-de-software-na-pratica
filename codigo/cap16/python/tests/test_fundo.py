# O fundo de reserva: a formatação em reais e duas saídas simultâneas com a linha do
# fundo travada, que nunca deixam o saldo negativo.
import os
from concurrent.futures import ThreadPoolExecutor

import pytest

from morada.banco import conectar, recriar_esquema
from morada.fundo import preparar_fundo, reais, registrar_saida, saldo
from morada.migracoes import aplicar_migracoes

URL = os.environ.get("BANCO_URL")


def test_reais_formata_centavos_com_separador_de_milhar_e_sinal():
    assert reais(100000) == "1.000,00"
    assert reais(-30000) == "-300,00"
    assert reais(5) == "0,05"


@pytest.mark.skipif(not URL, reason="sem banco")
def test_saidas_simultaneas_com_o_fundo_travado_nao_deixam_o_saldo_negativo():
    with conectar(URL) as banco:
        recriar_esquema(banco)
        aplicar_migracoes(banco, "/dados/migracoes")
        preparar_fundo(banco)

        def saida(pedido):
            valor, descricao = pedido
            with conectar(URL) as conexao:
                return registrar_saida(conexao, 1, valor, descricao)

        pedidos = [(70000, "conserto do portão"), (60000, "pintura da fachada")]
        with ThreadPoolExecutor(max_workers=2) as execucao:
            resultados = list(execucao.map(saida, pedidos))
        assert resultados.count(True) == 1
        assert saldo(banco, 1) >= 0
