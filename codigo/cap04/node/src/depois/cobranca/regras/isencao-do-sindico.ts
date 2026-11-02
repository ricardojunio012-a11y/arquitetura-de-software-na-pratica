import { lancamento, valorDe } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// O síndico não paga a taxa condominial (o fundo de reserva continua).
export class IsencaoDoSindico implements Regra {
  aplicar(unidade: Unidade, lancados: readonly Lancamento[]): Lancamento[] {
    if (!unidade.sindico) return [];
    return [lancamento("isencao", "Isenção do síndico", -valorDe(lancados, "taxa"))];
  }
}
