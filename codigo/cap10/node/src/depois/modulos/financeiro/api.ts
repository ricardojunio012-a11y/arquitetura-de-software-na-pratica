// API pública do Financeiro: a única porta que os outros módulos podem usar.
import { TabelaDeCobrancas } from "./interno/tabela.ts";

export function reais(centavos: number): string {
  const inteiro = String(Math.floor(centavos / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, "0")}`;
}

export class Financeiro {
  readonly #tabela: TabelaDeCobrancas;

  constructor(tabela: TabelaDeCobrancas) {
    this.#tabela = tabela;
  }

  emitir(cobranca: string, unidade: string, valorCentavos: number, vencimento: string) {
    this.#tabela.linhas.push({
      cobranca,
      unidade,
      valorCentavos,
      vencimento,
      situacao: "aberta",
      parcelas: 1,
    });
    return `${unidade} ${reais(valorCentavos)} vence ${vencimento}`;
  }

  pagar(cobranca: string, em: string) {
    this.#tabela.buscar(cobranca).situacao = "paga";
    return `em ${em}`;
  }

  parcelar(cobranca: string, parcelas: number) {
    const linha = this.#tabela.buscar(cobranca);
    linha.situacao = "parcelada";
    linha.parcelas = parcelas;
    return `${parcelas} parcelas`;
  }

  // Regra de inadimplência: cobrança parcelada num acordo não é débito
  unidadeEmDia(unidade: string, hoje: string): boolean {
    return !this.#tabela.linhas.some(
      (l) => l.unidade === unidade && l.situacao === "aberta" && l.vencimento < hoje,
    );
  }
}
