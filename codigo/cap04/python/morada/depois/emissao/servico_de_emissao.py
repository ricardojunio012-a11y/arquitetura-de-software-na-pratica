# Controlador (GRASP): coordena o cálculo e o registro sem fazer nenhum dos dois.
# Depende de abstrações recebidas pelo construtor (injeção de dependência).
from morada.depois.cobranca.calculadora import CalculadoraDeCobranca
from morada.depois.emissao.gateway import GatewayDePagamento, Prazos


class ServicoDeEmissao:
    def __init__(
        self,
        calculadora: CalculadoraDeCobranca,
        gateway: GatewayDePagamento,
        prazos: Prazos,
    ):
        self._calculadora = calculadora
        self._gateway = gateway
        self._prazos = prazos

    def emitir(self, unidades: list[dict]):
        cobrancas = [self._calculadora.calcular(u) for u in unidades]
        registros = [self._gateway.registrar(c, self._prazos) for c in cobrancas]
        return cobrancas, registros
