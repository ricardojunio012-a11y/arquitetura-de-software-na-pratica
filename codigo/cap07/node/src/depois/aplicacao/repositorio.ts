// Repositório: um por agregado. Salva a agenda inteira, nunca uma reserva solta.
import { Agenda, type PoliticaDeUso } from "../dominio/agenda.ts";
import { ErroDeDominio } from "../dominio/erro.ts";

export interface RepositorioDeAgendas {
  doEspaco(espaco: string): Agenda;
  daReserva(reserva: string): Agenda;
  salvar(agenda: Agenda): void;
  todas(): readonly Agenda[];
}

// Em memória no laboratório; o capítulo 16 guarda as agendas num banco de dados
export class AgendasEmMemoria implements RepositorioDeAgendas {
  readonly #agendas = new Map<string, Agenda>();

  constructor(politicas: Map<string, PoliticaDeUso>) {
    for (const [espaco, politica] of politicas) {
      this.#agendas.set(espaco, new Agenda(espaco, politica));
    }
  }

  doEspaco(espaco: string): Agenda {
    const agenda = this.#agendas.get(espaco);
    if (!agenda) throw new ErroDeDominio(`espaço desconhecido: ${espaco}`);
    return agenda;
  }

  daReserva(reserva: string): Agenda {
    const agenda = [...this.#agendas.values()].find((a) => a.tem(reserva));
    if (!agenda) throw new ErroDeDominio("reserva não encontrada");
    return agenda;
  }

  salvar(agenda: Agenda): void {
    this.#agendas.set(agenda.espaco, agenda);
  }

  todas(): readonly Agenda[] {
    return [...this.#agendas.values()];
  }
}
