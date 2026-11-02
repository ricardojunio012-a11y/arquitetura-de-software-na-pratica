# Uso: python -m morada.depois.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Raiz de composição: o único lugar que conhece as classes concretas e as monta.
import json
import os
import sys
from datetime import date

from morada.compartilhado.datas import data_do_mes, rotulo_do_mes
from morada.depois.cobranca.calculadora import CalculadoraDeCobranca
from morada.depois.cobranca.regras.debito_anterior import DebitoAnterior
from morada.depois.cobranca.regras.desconto_antecipado import DescontoAntecipado
from morada.depois.cobranca.regras.fundo_de_reserva import FundoDeReserva
from morada.depois.cobranca.regras.isencao_do_sindico import IsencaoDoSindico
from morada.depois.cobranca.regras.juros_por_atraso import JurosPorAtraso
from morada.depois.cobranca.regras.multa_por_atraso import MultaPorAtraso
from morada.depois.cobranca.regras.taxa_condominial import TaxaCondominial
from morada.depois.emissao.gateway import Prazos
from morada.depois.emissao.servico_de_emissao import ServicoDeEmissao
from morada.depois.provedores.gateway_banco_alfa import GatewayBancoAlfa
from morada.depois.provedores.gateway_paga_facil import GatewayPagaFacil
from morada.depois.relatorios import relatorio_de_cobrancas, relatorio_de_registros
from morada.externos.banco_alfa import ClienteBancoAlfa
from morada.externos.paga_facil import PagaFacilApi

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
p = dados["politica"]
prazos = Prazos(
    vencimento=data_do_mes(hoje, p["vencimentoDia"]),
    desconto_ate=data_do_mes(hoje, p["descontoAteDia"]),
)

# A ordem importa: cada regra vê o que as anteriores lançaram
regras = [
    TaxaCondominial(dados["condominio"]["despesasDoMesCentavos"]),
    FundoDeReserva(p["fundoDeReservaPorcento"]),
    IsencaoDoSindico(),
    DebitoAnterior(),
    MultaPorAtraso(p["multaPorcento"]),
    JurosPorAtraso(p["jurosAoMesPorcento"], hoje),
    # Por último: o desconto depende da isenção e do débito já lançados
    DescontoAntecipado(p["descontoAntecipadoPorcento"], prazos.desconto_ate),
]
gateways = {
    "alfa": lambda: GatewayBancoAlfa(ClienteBancoAlfa()),
    "pagafacil": lambda: GatewayPagaFacil(PagaFacilApi()),
}
gateway = gateways[os.environ.get("GATEWAY", "alfa")]()
servico = ServicoDeEmissao(CalculadoraDeCobranca(regras), gateway, prazos)

cobrancas, registros = servico.emitir(dados["unidades"])
titulo = f"{rotulo_do_mes(hoje)} - {dados['condominio']['nome']}"
relatorios = {
    "cobrancas": relatorio_de_cobrancas(titulo, cobrancas, prazos),
    "registros": relatorio_de_registros(titulo, gateway.nome, cobrancas, registros),
}
os.makedirs(saida, exist_ok=True)
for nome, texto in relatorios.items():
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write(texto)
print(f"cobranças emitidas em {saida} ({gateway.nome})")
