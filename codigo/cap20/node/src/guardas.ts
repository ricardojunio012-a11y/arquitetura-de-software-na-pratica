// Guardas (guardrails) do assistente. A injeção de prompt chega escondida nos próprios
// documentos: um texto que tenta dar ordens ao modelo. A defesa aqui é tirar esses
// trechos do contexto; em produção, ela se soma a um classificador e ao princípio de
// nunca dar ao modelo um poder que o usuário não tem.
const INJECAO = [
  /ignore (as|todas as) instru[cç][oõ]es/i,
  /desconsidere (o|as) (prompt|instru)/i,
  /voc[eê] agora [eé]/i,
  /revele (o|as) (prompt|instru)/i,
];

export const pareceInjecao = (texto: string) => INJECAO.some((r) => r.test(texto));

// Orçamento diário de tokens por condomínio: o custo de um não vira o custo de todos
export class Orcamento {
  readonly #limite: Map<number, number>;
  readonly #gasto = new Map<number, number>();

  constructor(limitePorCondominio: Record<string, number>) {
    this.#limite = new Map(
      Object.entries(limitePorCondominio).map(([c, n]) => [Number(c), n]),
    );
  }

  cabe(condominio: number, estimativa: number): boolean {
    const gasto = this.#gasto.get(condominio) ?? 0;
    return gasto + estimativa <= (this.#limite.get(condominio) ?? 0);
  }

  gastar(condominio: number, tokens: number) {
    this.#gasto.set(condominio, (this.#gasto.get(condominio) ?? 0) + tokens);
  }

  gasto(condominio: number) {
    return this.#gasto.get(condominio) ?? 0;
  }
}
