// A carga da API do Morada, em pedidos por segundo, a cada 15 s. São premissas do
// laboratório, não medições: um dia comum, os dias de vencimento e o dia 5, quando o
// lembrete "sua taxa vence hoje" sai às 8h para os moradores de 3.000 condomínios.
export const PASSO = 15; // segundos entre duas medições (o ciclo do HPA)
export const POR_DIA = (24 * 3600) / PASSO;

// Pedidos por segundo num dia comum, hora a hora (0h a 23h)
const DIA_COMUM = [
  15, 12, 10, 10, 12, 20, 40, 90, 160, 170, 165, 160, 130, 130, 150, 155, 150, 150, 170,
  175, 165, 130, 90, 40,
];

// Quanto cada dia do mês pesa em relação ao dia comum
export function fatorDoDia(dia: number): number {
  if (dia >= 1 && dia <= 4) return 1.3;
  if (dia === 5) return 1.6;
  if (dia >= 6 && dia <= 10) return 1.5 - (dia - 6) * 0.1;
  return 1;
}

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

// O lembrete do dia 5: chega a todos os celulares em 30 s, a partir das 8h, e o
// efeito cai à metade a cada 40 minutos
export function lembrete(segundos: number): number {
  const desde = segundos - 8 * 3600;
  if (desde < 0) return 0;
  const subida = Math.min(1, desde / 30);
  return 500 * subida * Math.pow(0.5, desde / 2400);
}

// A carga de um dia, a cada PASSO segundos, com variação de ±5% sorteada
export function cargaDoDia(dia: number, sorteio: () => number): number[] {
  const carga: number[] = [];
  for (let k = 0; k < POR_DIA; k++) {
    const s = k * PASSO;
    const h = s / 3600;
    const a = DIA_COMUM[Math.floor(h)];
    const b = DIA_COMUM[(Math.floor(h) + 1) % 24];
    const base = a + (b - a) * (h - Math.floor(h)); // interpola entre as horas
    const extra = dia === 5 ? lembrete(s) : 0;
    const variacao = 0.95 + 0.1 * sorteio();
    carga.push(Math.round((base * fatorDoDia(dia) + extra) * variacao));
  }
  return carga;
}

// O mês inteiro (30 dias), dia após dia, com uma só semente
export function cargaDoMes(semente: number): number[] {
  const sorteio = gerador(semente);
  const mes: number[] = [];
  for (let dia = 1; dia <= 30; dia++) mes.push(...cargaDoDia(dia, sorteio));
  return mes;
}
