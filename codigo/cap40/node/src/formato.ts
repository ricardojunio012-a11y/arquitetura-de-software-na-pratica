// Formatação em reais, sem depender da localidade instalada na imagem, e a
// gravação do resultado de cada versão em saida/<versão>/resultado.txt.
import fs from "node:fs";
import path from "node:path";

const milhar = (inteiro: string) => inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function numero(n: number, casas = 0): string {
  const [inteiro, decimal] = Math.abs(n).toFixed(casas).split(".");
  const sinal = n < 0 && Number(n.toFixed(casas)) !== 0 ? "-" : "";
  return sinal + milhar(inteiro) + (decimal ? "," + decimal : "");
}

export const reais = (n: number, casas = 0) => "R$ " + numero(n, casas);
export const pct = (n: number) => numero(n * 100, 1) + "%";

export function gravar(versao: string, linhas: string[]): void {
  const pasta = path.join(process.argv[2] ?? ".", "saida", versao);
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, "resultado.txt"), linhas.join("\n") + "\n");
  console.log(linhas.join("\n"));
}
