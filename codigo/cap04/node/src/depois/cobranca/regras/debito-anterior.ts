import { diaMes } from "../../../compartilhado/datas.ts";
import { lancamento } from "../tipos.ts";
import type { Lancamento, Regra, Unidade } from "../tipos.ts";

// O valor que ficou em aberto no mês anterior.
export class DebitoAnterior implements Regra {
  aplicar(unidade: Unidade): Lancamento[] {
    const d = unidade.debitoAnterior;
    if (!d) return [];
    const descricao = `Débito anterior (venc. ${diaMes(d.vencimento)})`;
    return [lancamento("debito", descricao, d.valorCentavos)];
  }
}
