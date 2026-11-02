// Reservas assina PagamentoConfirmado: a reserva aguardando pagamento é confirmada.
// O assinante é idempotente, porque o broker entrega "pelo menos uma vez".
import type { PagamentoConfirmado } from "../eventos.ts";

interface Reserva {
  reserva: string;
  unidade: string;
  espaco: string;
  data: string;
  situacao: string;
}

export class Reservas {
  readonly #reservas = new Map<string, Reserva>();
  readonly #processados = new Set<string>();
  readonly registro: string[] = [];

  constructor(iniciais: Omit<Reserva, "situacao">[]) {
    for (const r of iniciais) {
      this.#reservas.set(r.reserva, { ...r, situacao: "aguardando pagamento" });
    }
  }

  aoConfirmarPagamento(e: PagamentoConfirmado) {
    if (this.#processados.has(e.evento)) {
      this.registro.push(`reservas ignorou ${e.evento} (repetido)`);
      return;
    }
    this.#processados.add(e.evento);
    this.#reservas.get(e.reserva)!.situacao = "confirmada";
    this.registro.push(`reservas recebeu ${e.evento}: ${e.reserva} confirmada`);
  }

  linhas(): string[] {
    return [...this.#reservas.values()].map(
      (r) => `${r.reserva};${r.unidade};${r.espaco};${r.data};${r.situacao}`,
    );
  }
}
