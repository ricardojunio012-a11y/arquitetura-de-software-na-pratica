# Testes: o que a versão antes não deixa testar e o que a versão depois isola.
import json
import os
from datetime import date
from pathlib import Path

from morada.antes.emissao import emitir_cobrancas
from morada.depois.cobranca.calculadora import CalculadoraDeCobranca
from morada.depois.cobranca.regras.debito_anterior import DebitoAnterior
from morada.depois.cobranca.regras.desconto_antecipado import DescontoAntecipado
from morada.depois.cobranca.regras.fundo_de_reserva import FundoDeReserva
from morada.depois.cobranca.regras.isencao_do_sindico import IsencaoDoSindico
from morada.depois.cobranca.regras.taxa_condominial import TaxaCondominial
from morada.depois.cobranca.tipos import Lancamento
from morada.depois.emissao.gateway import Prazos, Registro
from morada.depois.emissao.servico_de_emissao import ServicoDeEmissao
from morada.externos.banco_alfa import ClienteBancoAlfa

HOJE = date(2026, 3, 2)
PRAZOS = Prazos(vencimento="2026-03-10", desconto_ate="2026-03-05")


def dados():
    # Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
    arquivo = "/dados/entrada/condominio.json"
    if not os.path.exists(arquivo):
        arquivo = Path(__file__).parents[2] / "entrada" / "condominio.json"
    with open(arquivo, encoding="utf-8") as f:
        return json.load(f)


class GatewayEmMemoria:
    """Dublê de teste: implementa a interface e só anota o que recebeu."""

    nome = "em memória"

    def __init__(self):
        self.recebidas = []

    def registrar(self, cobranca, prazos):
        self.recebidas.append(cobranca)
        return Registro(cobranca.unidade, "teste")


def test_antes_calcular_as_cobrancas_tambem_emite_boletos_no_banco():
    antes = ClienteBancoAlfa.emitidos
    emitir_cobrancas(dados(), HOJE)
    assert ClienteBancoAlfa.emitidos - antes == 8


def test_depois_uma_regra_nova_entra_sem_mudar_a_calculadora():
    d = dados()

    class TaxaExtra:
        def aplicar(self, unidade, lancados):
            return [Lancamento("obra", "Chamada para obra", 5000)]

    calculadora = CalculadoraDeCobranca(
        [TaxaCondominial(d["condominio"]["despesasDoMesCentavos"]), TaxaExtra()]
    )
    assert calculadora.calcular(d["unidades"][0]).total == 60625 + 5000


def test_depois_sindico_fica_isento_da_taxa_e_paga_o_fundo():
    d = dados()
    calculadora = CalculadoraDeCobranca(
        [
            TaxaCondominial(d["condominio"]["despesasDoMesCentavos"]),
            FundoDeReserva(10),
            IsencaoDoSindico(),
        ]
    )
    sindico = next(u for u in d["unidades"] if u.get("sindico"))
    assert calculadora.calcular(sindico).total == 6790


def test_depois_quem_tem_debito_nao_ganha_o_desconto_por_pontualidade():
    d = dados()
    calculadora = CalculadoraDeCobranca(
        [
            TaxaCondominial(d["condominio"]["despesasDoMesCentavos"]),
            DebitoAnterior(),
            DescontoAntecipado(5, PRAZOS.desconto_ate),
        ]
    )
    por_id = {u["id"]: u for u in d["unidades"]}
    assert calculadora.calcular(por_id["A-101"]).desconto == 3031
    assert calculadora.calcular(por_id["A-201"]).desconto == 0


def test_depois_emissao_funciona_com_qualquer_gateway_sem_banco_de_verdade():
    d = dados()
    gateway = GatewayEmMemoria()
    despesas = d["condominio"]["despesasDoMesCentavos"]
    calculadora = CalculadoraDeCobranca([TaxaCondominial(despesas)])
    antes = ClienteBancoAlfa.emitidos
    ServicoDeEmissao(calculadora, gateway, PRAZOS).emitir(d["unidades"])
    assert len(gateway.recebidas) == 8
    assert ClienteBancoAlfa.emitidos == antes
