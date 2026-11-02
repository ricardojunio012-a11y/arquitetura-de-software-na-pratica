// Valores em centavos e arredondamento meio para cima.
export function parteDe(centavos: number, milionesimos: number): number {
  return Math.floor((centavos * milionesimos + 500000) / 1000000);
}

export function percentual(centavos: number, porcento: number): number {
  return Math.floor((centavos * porcento + 50) / 100);
}

// 1.352,18 (formato brasileiro, com sinal quando negativo)
export function reais(c: number): string {
  const a = Math.abs(c);
  const inteiro = Math.floor(a / 100).toLocaleString("pt-BR");
  return (c < 0 ? "-" : "") + inteiro + "," + String(a % 100).padStart(2, "0");
}

// 1352.18 (formato pedido pela API do Banco Alfa)
export function reaisComPonto(c: number): string {
  return Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");
}
