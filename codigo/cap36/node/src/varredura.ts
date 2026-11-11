// Uma varredura de segredos no código, no espírito do gitleaks e do trufflehog:
// regras por formato conhecido e por nome de variável com um literal.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Achado {
  arquivo: string;
  linha: number;
  regra: string;
  amostra: string; // só o começo do valor: o relatório não pode vazar o segredo
}

const REGRAS: [string, RegExp][] = [
  ["chave de acesso da AWS", /\b(AKIA[0-9A-Z]{16})\b/],
  ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----()/],
  [
    "segredo em texto",
    /(?:senha|segredo|secret|password|token|apikey)\w*\s*[:=]\s*["']([^"']{8,})["']/i,
  ],
  ["URL com senha", /\w+:\/\/[^:/\s]+:([^@/\s$]{4,})@/],
];

export function varrerTexto(arquivo: string, texto: string): Achado[] {
  const achados: Achado[] = [];
  texto.split("\n").forEach((conteudo, i) => {
    for (const [regra, re] of REGRAS) {
      const m = conteudo.match(re);
      if (m) {
        const amostra = m[1] ? `${m[1].slice(0, 4)}…` : "";
        achados.push({ arquivo, linha: i + 1, regra, amostra });
      }
    }
  });
  return achados;
}

export function varrerPasta(pasta: string, prefixo = pasta): Achado[] {
  return readdirSync(pasta, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => {
      const caminho = join(pasta, e.name);
      if (e.isDirectory()) return varrerPasta(caminho, prefixo);
      const relativo = caminho.slice(prefixo.length + 1);
      return varrerTexto(relativo, readFileSync(caminho, "utf8"));
    });
}
