// Eventos de domínio: fatos que já aconteceram, com o vocabulário do negócio.
import type { Dinheiro } from "./dinheiro.ts";
import type { Periodo } from "./periodo.ts";

export interface ReservaConfirmada {
  readonly tipo: "ReservaConfirmada";
  readonly reserva: string;
  readonly espaco: string;
  readonly periodo: Periodo;
  readonly unidade: string;
  readonly taxa: Dinheiro;
}

export interface ReservaCancelada {
  readonly tipo: "ReservaCancelada";
  readonly reserva: string;
  readonly multa: Dinheiro;
}

export type EventoDeDominio = ReservaConfirmada | ReservaCancelada;
