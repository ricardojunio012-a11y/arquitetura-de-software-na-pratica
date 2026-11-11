// Peças comuns: o relógio simulado do laboratório e o gerador com semente.

// A data de "hoje" que o legado, o Morada e o proxy enxergam. O laboratório avança
// um dia por vez; nenhuma data vem do relógio da máquina.
export const relogio = { hoje: "2026-11-01" };

export function avancarDia(): void {
  const d = new Date(relogio.hoje + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  relogio.hoje = d.toISOString().slice(0, 10);
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

// R$ 1.048,72 a partir de 104872 centavos (o formato que o Morada mostra)
export function reais(centavos: number): string {
  const s = (Math.abs(centavos) / 100).toFixed(2).replace(".", ",");
  const [int, dec] = s.split(",");
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (centavos < 0 ? "-" : "") + "R$ " + milhar + "," + dec;
}

// Uma saída que vai para o terminal e para o arquivo verificado
export class Saida {
  linhas: string[] = [];
  escrever(texto = ""): void {
    this.linhas.push(texto);
    console.log(texto);
  }
}
