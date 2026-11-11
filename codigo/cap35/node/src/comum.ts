// O que os cenários têm em comum: a saída verificada, os tempos (fora da
// verificação) e a conexão com o banco.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export class Relato {
  private linhas: string[] = [];
  private tempos: string[] = [];
  private inicio = performance.now();
  private raiz: string;
  private versao: string;

  constructor(raiz: string, versao: string) {
    this.raiz = raiz;
    this.versao = versao;
  }

  dizer(s = ""): void {
    this.linhas.push(s);
    console.log(s);
  }

  // Tempos reais variam de máquina para máquina: vão para o terminal e para
  // saida/tempos, nunca para o resultado comparado com o aprovado
  marcar(etapa: string): void {
    const s = ((performance.now() - this.inicio) / 1000).toFixed(1);
    const linha = `${etapa.padEnd(48)}${s.padStart(7)} s`;
    this.tempos.push(linha);
    console.log(`   [tempo] ${linha}`);
  }

  zerarRelogio(): void {
    this.inicio = performance.now();
  }

  gravar(): void {
    const saida = path.join(this.raiz, "saida", this.versao);
    fs.mkdirSync(saida, { recursive: true });
    fs.writeFileSync(path.join(saida, "resultado.txt"), this.linhas.join("\n") + "\n");
    if (this.tempos.length === 0) return;
    const tempos = path.join(this.raiz, "saida", "tempos");
    fs.mkdirSync(tempos, { recursive: true });
    const arquivo = path.join(tempos, `${this.versao}.txt`);
    fs.writeFileSync(arquivo, this.tempos.join("\n") + "\n");
  }
}

export async function conectar(url: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
