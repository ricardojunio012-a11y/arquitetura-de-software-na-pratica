// Os casos de uso implementam a porta de entrada e usam a porta de saída. Não sabem
// se foram chamados por HTTP ou pelo terminal, nem onde as agendas são guardadas.
import { reais } from "../dominio/agenda.ts";
import type {
  CasosDeUsoDeReservas,
  PedidoDeReserva,
  RepositorioDeAgendas,
} from "./portas.ts";

export class ServicoDeReservas implements CasosDeUsoDeReservas {
  readonly #agendas: RepositorioDeAgendas;

  constructor(agendas: RepositorioDeAgendas) {
    this.#agendas = agendas;
  }

  async listarEspacos() {
    return (await this.#agendas.todas()).map((a) => ({
      id: a.espaco.id,
      taxa: reais(a.espaco.taxaCentavos),
      antecedenciaMinimaDias: a.espaco.antecedenciaMinimaDias,
    }));
  }

  async reservar(p: PedidoDeReserva) {
    const agenda = await this.#agendas.doEspaco(p.espaco);
    const r = agenda.reservar(p.reserva, p.unidade, p.data, p.inicio, p.fim, p.em);
    await this.#agendas.salvar(agenda);
    return {
      reserva: r.id,
      situacao: "confirmada" as const,
      taxa: reais(r.taxaCentavos),
    };
  }

  async cancelar(reserva: string, em: string) {
    const agenda = await this.#agendas.daReserva(reserva);
    const multa = agenda.cancelar(reserva, em);
    await this.#agendas.salvar(agenda);
    return { reserva, situacao: "cancelada" as const, multa: reais(multa) };
  }

  async reservasDoEspaco(espaco: string) {
    const agenda = await this.#agendas.doEspaco(espaco);
    return agenda.reservas().map((r) => ({
      reserva: r.id,
      unidade: r.unidade,
      periodo: `${r.data} ${r.inicio}h-${r.fim}h`,
    }));
  }
}
