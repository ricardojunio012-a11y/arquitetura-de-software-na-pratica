// Observer: quem publica um evento não conhece quem reage a ele.
import type { Pedido } from "./tipos.ts";

export interface Evento {
  tipo: "ReservaConfirmada" | "ReservaRecusada";
  pedido: Pedido;
  motivo?: string;
}

export interface Assinante {
  readonly nome: string;
  tratar(evento: Evento): void;
}

export class Barramento {
  readonly #assinantes = new Map<string, Assinante[]>();
  readonly falhas: string[] = [];

  assinar(tipo: Evento["tipo"], assinante: Assinante): void {
    this.#assinantes.set(tipo, [...(this.#assinantes.get(tipo) ?? []), assinante]);
  }

  // Um assinante que falha não impede os outros de receberem o evento
  publicar(evento: Evento): void {
    for (const assinante of this.#assinantes.get(evento.tipo) ?? []) {
      try {
        assinante.tratar(evento);
      } catch (erro) {
        const id = evento.pedido.id;
        this.falhas.push(`${evento.tipo} ${id}: ${assinante.nome}: ${erroTexto(erro)}`);
      }
    }
  }
}

function erroTexto(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
