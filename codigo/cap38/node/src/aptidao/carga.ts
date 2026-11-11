// A carga simulada: pedidos que chegam a taxa fixa e esperam uma conexão livre.
// O tempo de cada consulta vem de uma premissa, e não de um relógio de verdade; por
// isso o resultado é o mesmo em qualquer máquina e a cada execução.

// Gerador pseudoaleatório com semente (mulberry32)
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

// Premissas do laboratório, não medições
export const PREMISSAS = {
  msPorConsulta: 0.8, // ida e volta ao banco, com uma conexão já aberta
  msPorLinha: 0.004,
  chanceDeCauda: 0.02, // 2% das consultas demoram 4 vezes mais
};

// Duração de um pedido: a soma das suas consultas, cada uma com variação sorteada
export function duracao(linhasPorConsulta: number[], sorteio: () => number): number {
  let ms = 0;
  for (const linhas of linhasPorConsulta) {
    const base = PREMISSAS.msPorConsulta + PREMISSAS.msPorLinha * linhas;
    const variacao = 0.75 + 0.5 * sorteio();
    ms += base * variacao * (sorteio() < PREMISSAS.chanceDeCauda ? 4 : 1);
  }
  return ms;
}

// Fila com várias conexões: cada pedido usa a primeira que ficar livre
export function simular(chegadas: number[], duracoes: number[], conexoes: number) {
  const livreEm = new Array<number>(conexoes).fill(0);
  return chegadas.map((chegada, i) => {
    const c = livreEm.indexOf(Math.min(...livreEm));
    const inicio = Math.max(chegada, livreEm[c]);
    livreEm[c] = inicio + duracoes[i];
    return livreEm[c] - chegada; // latência: espera na fila mais duração
  });
}

// Percentil pelo posto mais próximo
export function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1)];
}
