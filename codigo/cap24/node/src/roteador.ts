// O roteamento do sharding por condomínio. Os condomínios caem em 12 shards lógicos;
// um mapa diz em que banco (shard físico) cada shard lógico está. Mover um shard
// lógico para outro banco é copiar as linhas e mudar uma entrada do mapa, sem
// recalcular o destino de nenhum outro condomínio.
export const SHARDS_LOGICOS = 12;

export class Roteador {
  readonly #mapa: Map<number, string>;

  constructor(mapa: Record<number, string>) {
    this.#mapa = new Map(Object.entries(mapa).map(([l, f]) => [Number(l), f]));
  }

  // Um hash simples, que basta para o laboratório; em produção, um hash que espalhe bem
  shardLogico(condominio: number) {
    return condominio % SHARDS_LOGICOS;
  }

  fisico(condominio: number) {
    return this.#mapa.get(this.shardLogico(condominio))!;
  }

  todos() {
    return [...new Set(this.#mapa.values())].sort();
  }

  mover(shardLogico: number, destino: string) {
    this.#mapa.set(shardLogico, destino);
  }
}
