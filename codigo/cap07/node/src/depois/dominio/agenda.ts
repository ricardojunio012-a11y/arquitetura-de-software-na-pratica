// Agregado: a agenda de um espaço é a fronteira de consistência. As regras que
// envolvem várias reservas (sobreposição, limite por unidade) só são garantidas
// por quem conhece todas elas. Ninguém de fora altera uma reserva sem passar por aqui.
import { Dinheiro } from "./dinheiro.ts";
import { ErroDeDominio } from "./erro.ts";
import type { EventoDeDominio } from "./eventos.ts";
import type { Periodo } from "./periodo.ts";
import { Reserva } from "./reserva.ts";

export interface PoliticaDeUso {
  readonly taxa: Dinheiro;
  readonly antecedenciaMinimaDias: number;
  readonly limitePorMes: number;
}

const ACRESCIMO_FIM_DE_SEMANA_PORCENTO = 20;
const MULTA_CANCELAMENTO_PORCENTO = 50;
const PRAZO_CANCELAMENTO_SEM_MULTA_DIAS = 2;

export class Agenda {
  readonly espaco: string;
  readonly #politica: PoliticaDeUso;
  readonly #reservas: Reserva[] = [];
  #eventos: EventoDeDominio[] = [];

  constructor(espaco: string, politica: PoliticaDeUso) {
    this.espaco = espaco;
    this.#politica = politica;
  }

  reservar(id: string, unidade: string, periodo: Periodo, hoje: string): Reserva {
    if (periodo.diasDesde(hoje) < this.#politica.antecedenciaMinimaDias) {
      throw new ErroDeDominio("antecedência mínima não respeitada");
    }
    const conflito = this.ativas().find((r) => r.periodo.sobrepoe(periodo));
    if (conflito) throw new ErroDeDominio(`horário sobreposto a ${conflito.id}`);
    const doMes = this.ativas().filter(
      (r) => r.unidade === unidade && r.periodo.mes() === periodo.mes(),
    );
    if (doMes.length >= this.#politica.limitePorMes) {
      throw new ErroDeDominio("limite mensal da unidade atingido");
    }
    const reserva = new Reserva(id, unidade, periodo, this.#taxaPara(periodo));
    this.#reservas.push(reserva);
    this.#eventos.push({
      tipo: "ReservaConfirmada",
      reserva: id,
      espaco: this.espaco,
      periodo,
      unidade,
      taxa: reserva.taxa,
    });
    return reserva;
  }

  cancelar(id: string, hoje: string): Dinheiro {
    const reserva = this.#reservas.find((r) => r.id === id);
    if (!reserva) throw new ErroDeDominio("reserva não encontrada");
    reserva.cancelar();
    const emCimaDaHora =
      reserva.periodo.diasDesde(hoje) < PRAZO_CANCELAMENTO_SEM_MULTA_DIAS;
    const multa = emCimaDaHora
      ? reserva.taxa.percentual(MULTA_CANCELAMENTO_PORCENTO)
      : Dinheiro.ZERO;
    this.#eventos.push({ tipo: "ReservaCancelada", reserva: id, multa });
    return multa;
  }

  tem(id: string): boolean {
    return this.#reservas.some((r) => r.id === id);
  }

  ativas(): readonly Reserva[] {
    return this.#reservas.filter((r) => r.ativa);
  }

  // Quem salva o agregado recolhe os eventos para publicá-los depois
  recolherEventos(): EventoDeDominio[] {
    const eventos = this.#eventos;
    this.#eventos = [];
    return eventos;
  }

  #taxaPara(periodo: Periodo): Dinheiro {
    const taxa = this.#politica.taxa;
    if (!periodo.ehFimDeSemana()) return taxa;
    return taxa.somar(taxa.percentual(ACRESCIMO_FIM_DE_SEMANA_PORCENTO));
  }
}
