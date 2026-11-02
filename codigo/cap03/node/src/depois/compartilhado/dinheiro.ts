// Valores em centavos e arredondamento meio para cima. Não depende de nenhum módulo.
export function parteDe(centavos: number, milionesimos: number): number {
  return Math.floor((centavos * milionesimos + 500000) / 1000000);
}

export function percentual(centavos: number, porcento: number): number {
  return Math.floor((centavos * porcento + 50) / 100);
}

export function reais(c: number): string {
  return (
    Math.floor(c / 100).toLocaleString("pt-BR") + "," + String(c % 100).padStart(2, "0")
  );
}
