// Interface pública da cobrança: os outros módulos só importam daqui.
import { rotuloDoMes } from "../compartilhado/datas.ts";
import { parteDe, reais } from "../compartilhado/dinheiro.ts";
import { encargos, fundoDeReserva } from "./regras.ts";

export interface Cobranca {
  readonly unidade: string;
  readonly morador: string;
  readonly taxa: number;
  readonly fundo: number;
  readonly debito: number;
  readonly diasDeAtraso: number;
  readonly multa: number;
  readonly juros: number;
  readonly total: number;
}

interface Unidade {
  id: string;
  fracaoMilionesimos: number;
  morador: { nome: string };
  debitoAnterior: { valorCentavos: number; vencimento: string } | null;
}

export function calcularCobrancas(
  despesas: number,
  unidades: Unidade[],
  hoje: Date,
): readonly Cobranca[] {
  return unidades.map((u) => {
    const taxa = parteDe(despesas, u.fracaoMilionesimos);
    const fundo = fundoDeReserva(taxa);
    const debito = u.debitoAnterior?.valorCentavos ?? 0;
    const e = u.debitoAnterior
      ? encargos(debito, u.debitoAnterior.vencimento, hoje)
      : { dias: 0, multa: 0, juros: 0 };
    const total = taxa + fundo + debito + e.multa + e.juros;
    return {
      unidade: u.id,
      morador: u.morador.nome,
      taxa,
      fundo,
      debito,
      diasDeAtraso: e.dias,
      multa: e.multa,
      juros: e.juros,
      total,
    };
  });
}

export function relatorioDeCobrancas(
  condominio: string,
  hoje: Date,
  cobrancas: readonly Cobranca[],
) {
  const linhas = [`# Cobranças ${rotuloDoMes(hoje)} - ${condominio}`];
  linhas.push("unidade;morador;taxa;fundo;debito;multa;juros;total");
  for (const c of cobrancas) {
    const valores = [c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total].map(reais);
    linhas.push([c.unidade, c.morador, ...valores].join(";"));
  }
  return linhas.join("\n") + "\n";
}
