// Gerador pseudoaleatório com semente (mulberry32): o mesmo sorteio a cada execução
export function gerador(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Uma duração com cauda longa: a maioria perto da mediana, poucas bem mais lentas
export function duracao(sortear: () => number, mediana: number): number {
  const u = Math.max(sortear(), 1e-9);
  return Math.round(mediana * Math.exp(0.5 * Math.sqrt(-2 * Math.log(u)) - 0.6));
}
