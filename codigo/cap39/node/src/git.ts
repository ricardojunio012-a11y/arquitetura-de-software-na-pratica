// Lê o histórico de um repositório git: quem mudou o quê, quando e em quantas horas.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Mudanca = {
  autor: string;
  data: string; // AAAA-MM-DD
  assunto: string;
  horas: number | null; // do trailer "Horas:", quando existir
  arquivos: string[];
};

// Início de um commit no log; o resto das linhas é a saída de --numstat.
const FORMATO = "--format=@@%x09%an%x09%as%x09%s%x09%(trailers:key=Horas,valueonly)";

export function lerLog(repo: string): Mudanca[] {
  const saida = execFileSync(
    "git",
    // safe.directory: o repositório montado no contêiner tem outro dono
    [
      "-c",
      "safe.directory=*",
      "log",
      "--reverse",
      "--no-merges",
      "--no-renames",
      "--numstat",
      FORMATO,
    ],
    { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 },
  );
  return interpretarLog(saida);
}

export function interpretarLog(saida: string): Mudanca[] {
  const mudancas: Mudanca[] = [];
  for (const linha of saida.split("\n")) {
    if (linha.startsWith("@@\t")) {
      const [, autor, data, assunto, horas] = linha.split("\t");
      const h = Number.parseFloat(horas ?? "");
      mudancas.push({
        autor,
        data,
        assunto,
        horas: Number.isNaN(h) ? null : h,
        arquivos: [],
      });
    } else if (/^(\d+|-)\t(\d+|-)\t/.test(linha)) {
      mudancas[mudancas.length - 1].arquivos.push(linha.split("\t")[2]);
    }
  }
  return mudancas;
}

export function arquivosAtuais(repo: string): Map<string, string> {
  const lista = execFileSync("git", ["-c", "safe.directory=*", "ls-files"], {
    cwd: repo,
    encoding: "utf8",
  });
  const conteudo = new Map<string, string>();
  for (const caminho of lista.split("\n").filter(Boolean)) {
    conteudo.set(caminho, readFileSync(join(repo, caminho), "utf8"));
  }
  return conteudo;
}
