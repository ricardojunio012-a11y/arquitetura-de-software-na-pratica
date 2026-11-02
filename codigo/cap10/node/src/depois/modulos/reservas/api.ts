// API pública de Reservas. O módulo declara o que precisa saber do Financeiro
// (SituacaoFinanceira) sem depender de como o Financeiro guarda os dados.
import { Agenda } from "./interno/agenda.ts";

export interface SituacaoFinanceira {
  unidadeEmDia(unidade: string, hoje: string): boolean;
}

export class RecusaErro extends Error {}

export class Reservas {
  readonly #agenda: Agenda;
  readonly #financeiro: SituacaoFinanceira;

  constructor(espacos: string[], financeiro: SituacaoFinanceira) {
    this.#agenda = new Agenda(espacos);
    this.#financeiro = financeiro;
  }

  reservar(reserva: string, unidade: string, espaco: string, data: string, em: string) {
    if (!this.#financeiro.unidadeEmDia(unidade, em)) {
      throw new RecusaErro(`unidade ${unidade} em débito`);
    }
    const ocupada = this.#agenda.ocupante(espaco, data);
    if (ocupada) throw new RecusaErro(`${espaco} já reservado em ${data}`);
    this.#agenda.registrar(reserva, espaco, data);
    return `${unidade} ${espaco} ${data}`;
  }
}
