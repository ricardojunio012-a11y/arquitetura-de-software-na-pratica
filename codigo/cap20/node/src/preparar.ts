// Cria a base de conhecimento a partir dos documentos de entrada.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { indexar } from "./base.ts";

export async function preparar(dados: string) {
  const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
  await banco.connect();
  await banco.query(fs.readFileSync(path.join(dados, "sql", "esquema.sql"), "utf8"));
  const trechos = await indexar(banco, path.join(dados, "entrada", "documentos"));
  return { banco, trechos };
}

export const lerJson = (dados: string, arquivo: string) =>
  JSON.parse(fs.readFileSync(path.join(dados, "entrada", arquivo), "utf8"));

export function gravar(
  dados: string,
  versao: string,
  arquivo: string,
  linhas: string[],
) {
  const saida = path.join(dados, "saida", versao);
  fs.mkdirSync(saida, { recursive: true });
  fs.writeFileSync(path.join(saida, arquivo), linhas.join("\n") + "\n");
}
