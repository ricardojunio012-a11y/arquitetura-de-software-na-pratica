// Algoritmos de balanceamento: dado o estado dos servidores, para qual vai o próximo
// pedido. Os servidores são simulados; o que importa é a decisão.

export interface Servidor {
  emAndamento: number; // pedidos sendo atendidos agora
}

export type Algoritmo = (
  servidores: Servidor[],
  chave: number,
  sorteio: () => number,
) => number;

let proximo = 0;
export const rodizio: Algoritmo = (servidores) => proximo++ % servidores.length;

export const menosConexoes: Algoritmo = (servidores) =>
  servidores.reduce(
    (melhor, s, i) => (s.emAndamento < servidores[melhor].emAndamento ? i : melhor),
    0,
  );

// O poder de duas escolhas: sorteia dois servidores e fica com o menos ocupado
export const duasEscolhas: Algoritmo = (servidores, _chave, sorteio) => {
  const a = Math.floor(sorteio() * servidores.length);
  const b = Math.floor(sorteio() * servidores.length);
  return servidores[a].emAndamento <= servidores[b].emAndamento ? a : b;
};

// Hash da chave (o condomínio): o mesmo condomínio sempre no mesmo servidor
export const hashDaChave: Algoritmo = (servidores, chave) => chave % servidores.length;

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
