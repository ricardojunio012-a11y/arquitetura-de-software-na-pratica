// Camada de aplicação: os casos de uso. Recebe dados simples, chama o domínio e o
// repositório e devolve dados simples. Não sabe que existe HTTP.
import type { RepositorioDeAgendas } from "../dados/repositorio.ts";
import { reais } from "../dominio/dominio.ts";

export interface PedidoDeReserva {
  reserva: string;
  unidade: string;
  espaco: string;
  data: string;
  inicio: number;
  fim: number;
  em: string;
}

export class ServicoDeReservas {
  readonly #agendas: RepositorioDeAgendas;

  constructor(agendas: RepositorioDeAgendas) {
    this.#agendas = agendas;
  }

  listarEspacos() {
    return this.#agendas.todas().map((a) => ({
      id: a.espaco.id,
      taxa: reais(a.espaco.taxaCentavos),
      antecedenciaMinimaDias: a.espaco.antecedenciaMinimaDias,
    }));
  }

  reservar(p: PedidoDeReserva) {
    const agenda = this.#agendas.doEspaco(p.espaco);
    const r = agenda.reservar(p.reserva, p.unidade, p.data, p.inicio, p.fim, p.em);
    return { reserva: r.id, situacao: "confirmada", taxa: reais(r.taxaCentavos) };
  }

  cancelar(reserva: string, em: string) {
    const multa = this.#agendas.daReserva(reserva).cancelar(reserva, em);
    return { reserva, situacao: "cancelada", multa: reais(multa) };
  }

  reservasDoEspaco(espaco: string) {
    return this.#agendas
      .doEspaco(espaco)
      .reservas()
      .map((r) => ({
        reserva: r.id,
        unidade: r.unidade,
        periodo: `${r.data} ${r.inicio}h-${r.fim}h`,
      }));
  }
}
