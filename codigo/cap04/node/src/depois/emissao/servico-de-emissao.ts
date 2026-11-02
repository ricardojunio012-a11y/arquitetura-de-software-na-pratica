// Controlador (GRASP): coordena o cálculo e o registro sem fazer nenhum dos dois.
// Depende de abstrações recebidas pelo construtor (injeção de dependência).
import type { CalculadoraDeCobranca } from "../cobranca/calculadora.ts";
import type { Cobranca } from "../cobranca/cobranca.ts";
import type { Unidade } from "../cobranca/tipos.ts";
import type { GatewayDePagamento, Prazos, Registro } from "./gateway.ts";

export class ServicoDeEmissao {
  readonly #calculadora: CalculadoraDeCobranca;
  readonly #gateway: GatewayDePagamento;
  readonly #prazos: Prazos;

  constructor(
    calculadora: CalculadoraDeCobranca,
    gateway: GatewayDePagamento,
    prazos: Prazos,
  ) {
    this.#calculadora = calculadora;
    this.#gateway = gateway;
    this.#prazos = prazos;
  }

  emitir(unidades: readonly Unidade[]): {
    cobrancas: Cobranca[];
    registros: Registro[];
  } {
    const cobrancas = unidades.map((u) => this.#calculadora.calcular(u));
    const registros = cobrancas.map((c) => this.#gateway.registrar(c, this.#prazos));
    return { cobrancas, registros };
  }
}
