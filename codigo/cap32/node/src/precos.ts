// Preços públicos da AWS em São Paulo (sa-east-1), sob demanda, em dólares,
// conferidos nas listas de preços oficiais (AWS Price List) em 27/10/2026:
//   AWSLambda   publicada em 22/10/2026
//   AmazonEKS   publicada em 28/09/2026
//   AmazonEC2   publicada em 23/10/2026
// Preço muda: confira de novo antes de decidir com estes números.
export const PRECOS = {
  lambdaPorRequisicao: 0.0000002, // US$ 0,20 por milhão
  lambdaPorGbSegundo: 0.0000166667, // x86, primeira faixa
  eksPorHora: 0.1, // plano de controle do cluster, suporte padrão
  noPorHora: 0.1301, // m7g.large (2 vCPU, 8 GiB), Linux
};

// Premissas da coleção (capítulo 12 e seguintes)
export const DOLAR = 5.5; // R$ por US$
export const HORAS_MES = 720; // o mês simulado tem 30 dias

export const reais = (dolares: number) => dolares * DOLAR;
// 1234.5 -> "1.234,50", sem depender dos dados de idioma da imagem
export function numero(v: number, casas = 2): string {
  const [int, dec] = v.toFixed(casas).split(".");
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${milhar},${dec}` : milhar;
}
export const brl = (v: number) => `R$ ${numero(v)}`;
