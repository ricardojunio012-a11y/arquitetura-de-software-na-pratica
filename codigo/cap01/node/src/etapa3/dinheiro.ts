// Valores sempre em centavos (inteiros), para não perder precisão.
// Arredondamento: meio centavo para cima.

export function parteDe(centavos: number, milionesimos: number): number {
  return Math.floor((centavos * milionesimos + 500000) / 1000000);
}

export function percentual(centavos: number, porcento: number): number {
  return Math.floor((centavos * porcento + 50) / 100);
}

// 123456 -> "1.234,56"
export function reais(centavos: number): string {
  const inteiro = Math.floor(centavos / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return inteiro + "," + String(centavos % 100).padStart(2, "0");
}
