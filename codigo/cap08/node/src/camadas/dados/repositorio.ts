// Camada de dados: onde as agendas ficam guardadas. Hoje, em memória; no capítulo 16,
// num banco de dados. As camadas de cima não percebem a troca.
import { Agenda, NaoEncontradoErro, type Espaco } from "../dominio/dominio.ts";

export class RepositorioDeAgendas {
  readonly #agendas = new Map<string, Agenda>();

  constructor(espacos: Espaco[]) {
    for (const e of espacos) this.#agendas.set(e.id, new Agenda(e));
  }

  todas(): Agenda[] {
    return [...this.#agendas.values()];
  }

  doEspaco(id: string): Agenda {
    const agenda = this.#agendas.get(id);
    if (!agenda) throw new NaoEncontradoErro("espaço não encontrado");
    return agenda;
  }

  daReserva(id: string): Agenda {
    const agenda = this.todas().find((a) => a.tem(id));
    if (!agenda) throw new NaoEncontradoErro("reserva não encontrada");
    return agenda;
  }
}
