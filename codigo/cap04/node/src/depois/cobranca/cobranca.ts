// A cobrança de uma unidade. Especialista na informação (GRASP): quem tem os
// lançamentos é quem calcula os totais.
import type { Lancamento } from "./tipos.ts";

export class Cobranca {
  readonly unidade: string;
  readonly morador: string;
  readonly lancamentos: readonly Lancamento[];

  constructor(unidade: string, morador: string, lancamentos: readonly Lancamento[]) {
    this.unidade = unidade;
    this.morador = morador;
    this.lancamentos = Object.freeze([...lancamentos]);
  }

  get total(): number {
    return this.#soma(false);
  }

  // Desconto condicional, em valor positivo
  get desconto(): number {
    return -this.#soma(true);
  }

  #soma(condicional: boolean): number {
    return this.lancamentos
      .filter((l) => l.condicional === condicional)
      .reduce((s, l) => s + l.valor, 0);
  }
}
