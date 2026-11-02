import { diasEntre } from "../../../compartilhado/datas.ts";
import { lancamento } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// Juros ao mês, proporcionais aos dias de atraso (mês de 30 dias).
export class JurosPorAtraso implements Regra {
  readonly #porcentoAoMes: number;
  readonly #hoje: Date;

  constructor(porcentoAoMes: number, hoje: Date) {
    this.#porcentoAoMes = porcentoAoMes;
    this.#hoje = hoje;
  }

  aplicar(unidade: Unidade): Lancamento[] {
    const d = unidade.debitoAnterior;
    if (!d) return [];
    const dias = diasEntre(d.vencimento, this.#hoje);
    const juros = Math.floor(
      (d.valorCentavos * this.#porcentoAoMes * dias + 1500) / 3000,
    );
    return [lancamento("juros", `Juros (${dias} dias)`, juros)];
  }
}
