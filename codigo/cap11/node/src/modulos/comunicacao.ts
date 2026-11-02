// Comunicação assina o mesmo evento e avisa o morador. Não conhece Reservas:
// tudo o que precisa veio dentro do evento.
import { reais, type PagamentoConfirmado } from "../eventos.ts";

export class Comunicacao {
  readonly #processados = new Set<string>();
  readonly avisos: string[] = [];
  readonly registro: string[] = [];

  aoConfirmarPagamento(e: PagamentoConfirmado) {
    if (this.#processados.has(e.evento)) {
      this.registro.push(`comunicacao ignorou ${e.evento} (repetido)`);
      return;
    }
    this.#processados.add(e.evento);
    const valor = reais(e.valorCentavos);
    const pagamento = `pagamento ${e.pagamento} de ${valor} recebido`;
    this.avisos.push(`${e.unidade}: ${pagamento}; reserva ${e.reserva} confirmada`);
    this.registro.push(`comunicacao recebeu ${e.evento}: avisou ${e.unidade}`);
  }
}
