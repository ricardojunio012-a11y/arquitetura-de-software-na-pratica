// Os tipos de que a calculadora depende. Nenhum deles conhece uma regra concreta.
export interface Unidade {
  id: string;
  fracaoMilionesimos: number;
  morador: { nome: string };
  sindico?: boolean;
  debitoAnterior: { valorCentavos: number; vencimento: string } | null;
}

// Um item da cobrança. Condicional: só vale para pagamento até a data do desconto.
export interface Lancamento {
  readonly codigo: string;
  readonly descricao: string;
  readonly valor: number;
  readonly condicional: boolean;
}

// Cada regra olha a unidade e o que já foi lançado, e devolve o que acrescenta.
export interface Regra {
  aplicar(unidade: Unidade, lancados: readonly Lancamento[]): Lancamento[];
}

export function lancamento(
  codigo: string,
  descricao: string,
  valor: number,
  condicional = false,
): Lancamento {
  return { codigo, descricao, valor, condicional };
}

export function valorDe(lancados: readonly Lancamento[], codigo: string): number {
  return lancados.filter((l) => l.codigo === codigo).reduce((s, l) => s + l.valor, 0);
}
