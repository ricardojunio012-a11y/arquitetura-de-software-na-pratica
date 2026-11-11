// Representação vetorial (embedding) simplificada e determinística: cada palavra
// relevante cai numa de 256 posições, por um hash, e o vetor é normalizado. Um modelo
// de embeddings de verdade capta sinônimos e contexto; este só capta palavras em
// comum, o que basta para mostrar a arquitetura com uma saída que não muda de uma
// execução para outra.
const PARADAS = new Set(
  [
    "a o as os de da do das dos e é em no na nos nas um uma para por com que se",
    "ao à qual quais quanto quanta quantos quantas como posso pode ser são até",
    "sobre foi fazer devo",
  ]
    .join(" ")
    .split(" "),
);
export const DIMENSOES = 256;
const ACENTOS = /\p{M}/gu; // as marcas de acento que o NFD separa das letras

export function palavras(texto: string): string[] {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(ACENTOS, "")
      .split(/[^a-z0-9]+/)
      .filter((p) => p && !PARADAS.has(p))
      // Um radical grosseiro: os cinco primeiros caracteres (reserva, reservar)
      .map((p) => p.slice(0, 5))
  );
}

function hash(palavra: string): number {
  let h = 2166136261;
  for (const c of palavra) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % DIMENSOES;
}

export function vetorizar(texto: string): number[] {
  const v = new Array(DIMENSOES).fill(0);
  for (const p of palavras(texto)) v[hash(p)] += 1;
  const norma = Math.hypot(...v) || 1;
  return v.map((x) => Number((x / norma).toFixed(6)));
}

// Tokens, para estimar custo: cerca de quatro caracteres por token
export const tokens = (texto: string) => Math.ceil(texto.length / 4);
