// A tabela do Financeiro: dado privado do módulo. Nenhum outro módulo deve lê-la.
export type Situacao = "aberta" | "paga" | "parcelada";

export interface LinhaDeCobranca {
  cobranca: string;
  unidade: string;
  valorCentavos: number;
  vencimento: string;
  situacao: Situacao;
  parcelas: number;
}

export class TabelaDeCobrancas {
  readonly linhas: LinhaDeCobranca[] = [];

  buscar(cobranca: string): LinhaDeCobranca {
    const linha = this.linhas.find((l) => l.cobranca === cobranca);
    if (!linha) throw new Error(`cobrança ${cobranca} não encontrada`);
    return linha;
  }
}
