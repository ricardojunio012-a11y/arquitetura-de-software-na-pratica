// O Backend for Frontend do app do porteiro. Pertence ao time do app e fala a língua
// da tela: junta numa chamada o que o tablet precisa e recebe as operações feitas
// sem internet, em lote, aplicando cada uma uma vez só.
import type { Convidado, Portaria, Reservas } from "./backend.ts";

export interface Operacao {
  id: string;
  tipo: "entregar" | "devolver" | "registrarVisitante";
  hora: string;
  encomenda?: string;
  versaoVista?: number;
  nome?: string;
  reserva?: string;
}

export class BffPorteiro {
  readonly #portaria: Portaria;
  readonly #reservas: Reservas;
  readonly #resultados: Map<string, string>;
  repetidas = 0;

  // Sem o terceiro argumento, os resultados ficam só na memória deste processo
  constructor(portaria: Portaria, reservas: Reservas, resultados = new Map()) {
    this.#portaria = portaria;
    this.#reservas = reservas;
    this.#resultados = resultados;
  }

  // A tela inicial inteira numa chamada, só com os campos que o tablet mostra
  inicio() {
    const encomendasPendentes = [...this.#portaria.encomendas.values()]
      .filter((e) => e.situacao === "na portaria")
      .map(({ encomenda, unidade, versao }) => ({ encomenda, unidade, versao }));
    // Compara nome e reserva campo a campo: "Ana" não pode casar com "Maria Ana"
    const entrou = (c: Convidado) =>
      this.#portaria.visitantes.some(
        (v) => v.nome === c.nome && v.reserva === c.reserva,
      );
    const visitantesEsperados = this.#reservas.convidados().filter((c) => !entrou(c));
    return { encomendasPendentes, visitantesEsperados };
  }

  // Idempotente pelo id da operação: um lote reenviado não aplica nada duas vezes
  sincronizar(tablet: string, operacoes: Operacao[]): [Operacao, string][] {
    return operacoes.map((op) => {
      const anterior = this.#resultados.get(op.id);
      if (anterior) {
        this.repetidas += 1;
        return [op, anterior];
      }
      const resultado =
        op.tipo === "registrarVisitante"
          ? this.#portaria.registrarVisitante(op.nome!, op.reserva!, tablet, op.hora)
          : this.#portaria.mudar(
              op.encomenda!,
              op.tipo === "entregar" ? "entregue" : "devolvida",
              op.versaoVista!,
              tablet,
              op.hora,
            );
      this.#resultados.set(op.id, resultado);
      return [op, resultado];
    });
  }
}
