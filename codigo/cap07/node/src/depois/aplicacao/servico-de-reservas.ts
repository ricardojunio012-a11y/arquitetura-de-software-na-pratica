// Serviço de aplicação: traduz um comando em chamadas ao domínio. Carrega o
// agregado, pede o trabalho a ele, salva e publica os eventos. Sem regra de negócio.
import { ErroDeDominio } from "../dominio/erro.ts";
import type { EventoDeDominio } from "../dominio/eventos.ts";
import { Periodo } from "../dominio/periodo.ts";
import type { RepositorioDeAgendas } from "./repositorio.ts";

export interface Comando {
  tipo: "reservar" | "cancelar";
  reserva: string;
  em: string;
  unidade?: string;
  espaco?: string;
  data?: string;
  inicio?: number;
  fim?: number;
}

export interface Resultado {
  reserva: string;
  comando: string;
  situacao: string;
  detalhe: string;
}

export class ServicoDeReservas {
  readonly #agendas: RepositorioDeAgendas;
  readonly #publicar: (evento: EventoDeDominio) => void;

  constructor(agendas: RepositorioDeAgendas, publicar: (e: EventoDeDominio) => void) {
    this.#agendas = agendas;
    this.#publicar = publicar;
  }

  executar(c: Comando): Resultado {
    try {
      return c.tipo === "reservar" ? this.#reservar(c) : this.#cancelar(c);
    } catch (erro) {
      if (!(erro instanceof ErroDeDominio)) throw erro;
      const situacao = c.tipo === "reservar" ? "recusada" : "não cancelada";
      return { reserva: c.reserva, comando: c.tipo, situacao, detalhe: erro.message };
    }
  }

  #reservar(c: Comando): Resultado {
    const periodo = new Periodo(c.data!, c.inicio!, c.fim!);
    const agenda = this.#agendas.doEspaco(c.espaco!);
    const reserva = agenda.reservar(c.reserva, c.unidade!, periodo, c.em);
    this.#salvar(agenda);
    return {
      reserva: c.reserva,
      comando: c.tipo,
      situacao: "confirmada",
      detalhe: reserva.taxa.toString(),
    };
  }

  #cancelar(c: Comando): Resultado {
    const agenda = this.#agendas.daReserva(c.reserva);
    const multa = agenda.cancelar(c.reserva, c.em);
    this.#salvar(agenda);
    const detalhe = multa.centavos > 0 ? `multa ${multa}` : "sem multa";
    return { reserva: c.reserva, comando: c.tipo, situacao: "cancelada", detalhe };
  }

  #salvar(agenda: ReturnType<RepositorioDeAgendas["doEspaco"]>): void {
    this.#agendas.salvar(agenda);
    agenda.recolherEventos().forEach(this.#publicar);
  }
}
