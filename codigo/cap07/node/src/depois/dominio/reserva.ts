// Entidade: tem identidade (o id) e ciclo de vida. Só muda pelos próprios métodos.
import type { Dinheiro } from "./dinheiro.ts";
import { ErroDeDominio } from "./erro.ts";
import type { Periodo } from "./periodo.ts";

export class Reserva {
  readonly id: string;
  readonly unidade: string;
  readonly periodo: Periodo;
  readonly taxa: Dinheiro;
  #situacao: "confirmada" | "cancelada" = "confirmada";

  constructor(id: string, unidade: string, periodo: Periodo, taxa: Dinheiro) {
    this.id = id;
    this.unidade = unidade;
    this.periodo = periodo;
    this.taxa = taxa;
  }

  get ativa(): boolean {
    return this.#situacao === "confirmada";
  }

  cancelar(): void {
    if (!this.ativa) throw new ErroDeDominio("reserva não está confirmada");
    this.#situacao = "cancelada";
  }
}
