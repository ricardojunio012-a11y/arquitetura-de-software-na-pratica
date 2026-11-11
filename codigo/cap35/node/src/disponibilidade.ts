// As contas de disponibilidade composta da seção 35.1.

// Todas precisam funcionar: as disponibilidades se multiplicam
export const emSerie = (ps: number[]) => ps.reduce((a, p) => a * p, 1);

// Basta uma funcionar, e as falhas são independentes: as indisponibilidades
// se multiplicam
export const emParalelo = (ps: number[]) => 1 - ps.reduce((a, p) => a * (1 - p), 1);

// Réplicas em paralelo que dependem de algo comum (a mesma zona, o mesmo banco):
// o componente comum fica em série com o conjunto
export const comComum = (comum: number, replicas: number[]) =>
  emSerie([comum, emParalelo(replicas)]);

export const horasForaPorAno = (p: number) => (1 - p) * 365 * 24;

export const porcento = (p: number, casas = 2) =>
  `${(p * 100).toFixed(casas).replace(".", ",")}%`;
