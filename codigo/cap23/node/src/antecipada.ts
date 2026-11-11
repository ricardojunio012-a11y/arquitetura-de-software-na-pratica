// Expiração antecipada probabilística (XFetch). Cada pedido sorteia se recalcula o
// valor antes do vencimento. A chance cresce à medida que o vencimento se aproxima, e
// cresce mais cedo para valores caros de gerar (custo maior). Assim, em geral um
// pedido só regenera o valor pouco antes de ele vencer, e os outros nunca ficam sem
// ele.
export function deveRecalcular(
  agora: number,
  vence: number,
  custo: number,
  beta: number,
  sorteio: number, // entre 0 e 1
): boolean {
  // -ln(sorteio) é positivo e quase sempre pequeno, às vezes grande
  return agora - custo * beta * Math.log(sorteio) >= vence;
}

// Gerador pseudoaleatório com semente, para a simulação dar sempre o mesmo resultado
export function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
