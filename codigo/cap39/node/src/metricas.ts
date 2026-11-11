// Pontos quentes e acoplamento de mudança, a partir do histórico.
import type { Mudanca } from "./git.ts";

// Commits que tocam muitos arquivos (importação, formatação, troca de licença)
// não dizem nada sobre o design e criam acoplamentos falsos: ficam de fora.
export const MAXIMO_DE_ARQUIVOS = 10;

export function filtrar(mudancas: Mudanca[], maximo = MAXIMO_DE_ARQUIVOS) {
  return mudancas.filter((m) => m.arquivos.length <= maximo);
}

// Complexidade pela indentação: soma dos níveis de recuo das linhas não vazias.
// Não depende da linguagem e acompanha bem as métricas mais caras (Tornhill).
export function complexidade(texto: string, espacosPorNivel = 2): number {
  let total = 0;
  for (const linha of texto.split("\n")) {
    if (linha.trim() === "") continue;
    const recuo = linha.length - linha.trimStart().length;
    total += Math.floor(recuo / espacosPorNivel);
  }
  return total;
}

export type PontoQuente = {
  arquivo: string;
  revisoes: number;
  linhas: number;
  complexidade: number;
  prioridade: number; // 0 a 100
  autorPrincipal: string;
  parteDoAutor: number; // fração dos commits do arquivo
};

export function pontosQuentes(
  mudancas: Mudanca[],
  atuais: Map<string, string>,
): PontoQuente[] {
  const revisoes = new Map<string, number>();
  const autores = new Map<string, Map<string, number>>();
  for (const m of mudancas) {
    for (const a of m.arquivos) {
      if (!atuais.has(a)) continue; // arquivo que já não existe
      revisoes.set(a, (revisoes.get(a) ?? 0) + 1);
      const porAutor = autores.get(a) ?? new Map<string, number>();
      porAutor.set(m.autor, (porAutor.get(m.autor) ?? 0) + 1);
      autores.set(a, porAutor);
    }
  }
  const lista = [...revisoes].map(([arquivo, n]) => {
    const texto = atuais.get(arquivo)!;
    const [autor, vezes] = [...autores.get(arquivo)!].sort(
      (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
    )[0];
    return {
      arquivo,
      revisoes: n,
      linhas: texto.split("\n").filter((l) => l.trim() !== "").length,
      complexidade: complexidade(texto),
      prioridade: 0,
      autorPrincipal: autor,
      parteDoAutor: vezes / n,
    };
  });
  // Prioridade: frequência de mudança × complexidade, as duas relativas ao maior valor.
  const maxRev = Math.max(...lista.map((p) => p.revisoes));
  const maxCx = Math.max(...lista.map((p) => p.complexidade));
  for (const p of lista) {
    p.prioridade = Math.round((100 * p.revisoes * p.complexidade) / (maxRev * maxCx));
  }
  return lista.sort(
    (x, y) => y.prioridade - x.prioridade || x.arquivo.localeCompare(y.arquivo),
  );
}

export type Par = {
  a: string;
  b: string;
  juntos: number; // commits em que os dois mudaram
  grau: number; // juntos ÷ média das revisões dos dois, de 0 a 1
};

// Acoplamento de mudança: pares de arquivos que mudam nos mesmos commits.
export function acoplamento(
  mudancas: Mudanca[],
  minimoJuntos = 5,
  grauMinimo = 0.3,
): Par[] {
  const revisoes = new Map<string, number>();
  const juntos = new Map<string, number>();
  for (const m of mudancas) {
    const arquivos = [...new Set(m.arquivos)].sort();
    for (const a of arquivos) revisoes.set(a, (revisoes.get(a) ?? 0) + 1);
    for (let i = 0; i < arquivos.length; i++) {
      for (let j = i + 1; j < arquivos.length; j++) {
        const chave = `${arquivos[i]}\t${arquivos[j]}`;
        juntos.set(chave, (juntos.get(chave) ?? 0) + 1);
      }
    }
  }
  const pares: Par[] = [];
  for (const [chave, n] of juntos) {
    const [a, b] = chave.split("\t");
    const media = (revisoes.get(a)! + revisoes.get(b)!) / 2;
    const grau = n / media;
    if (n >= minimoJuntos && grau >= grauMinimo) pares.push({ a, b, juntos: n, grau });
  }
  return pares.sort((x, y) => y.grau - x.grau || y.juntos - x.juntos);
}

// O acoplamento aparece no código? Procura um import de um arquivo no outro.
export function importa(texto: string, alvo: string): boolean {
  const nome = alvo.split("/").pop()!.replace(/\.ts$/, "");
  return new RegExp(`^import .* from ".*/${nome}(\\.ts)?";`, "m").test(texto);
}
