// State: o que se pode fazer com uma reserva depende do estado em que ela está.
// Cada estado é um objeto que sabe quais transições aceita; a reserva só repassa.
import type { Pedido } from "./tipos.ts";

export abstract class Estado {
  abstract readonly nome: string;

  // Por padrão, nenhuma transição é permitida; cada estado libera as suas
  aprovar(reserva: Reserva): void {
    this.recusarTransicao("aprovar");
  }

  recusar(reserva: Reserva): void {
    this.recusarTransicao("recusar");
  }

  cancelar(reserva: Reserva): void {
    this.recusarTransicao("cancelar");
  }

  private recusarTransicao(acao: string): never {
    throw new Error(`não é possível ${acao} uma reserva ${this.nome}`);
  }
}

class Pendente extends Estado {
  readonly nome = "pendente";

  override aprovar(reserva: Reserva): void {
    reserva.mudarPara(APROVADA);
  }

  override recusar(reserva: Reserva): void {
    reserva.mudarPara(RECUSADA);
  }

  override cancelar(reserva: Reserva): void {
    reserva.mudarPara(CANCELADA);
  }
}

class Aprovada extends Estado {
  readonly nome = "aprovada";

  override cancelar(reserva: Reserva): void {
    reserva.mudarPara(CANCELADA);
  }
}

class Recusada extends Estado {
  readonly nome = "recusada";
}

class Cancelada extends Estado {
  readonly nome = "cancelada";
}

// Os estados não guardam dados próprios: uma instância de cada basta
const APROVADA = new Aprovada();
const RECUSADA = new Recusada();
const CANCELADA = new Cancelada();

export class Reserva {
  readonly pedido: Pedido;
  #estado: Estado = new Pendente();

  constructor(pedido: Pedido) {
    this.pedido = pedido;
  }

  get estado(): string {
    return this.#estado.nome;
  }

  aprovar(): void {
    this.#estado.aprovar(this);
  }

  recusar(): void {
    this.#estado.recusar(this);
  }

  cancelar(): void {
    this.#estado.cancelar(this);
  }

  // Usado só pelos estados
  mudarPara(estado: Estado): void {
    this.#estado = estado;
  }
}
