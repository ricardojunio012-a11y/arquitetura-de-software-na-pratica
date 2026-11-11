// A base de conhecimento: indexa os documentos de cada condomínio no pgvector e busca
// os trechos mais parecidos com uma pergunta.
import fs from "node:fs";
import path from "node:path";
import type pg from "pg";
import { vetorizar } from "./texto.ts";

export interface Trecho {
  documento: string;
  texto: string;
  similaridade: number;
}

// Cada arquivo é "<condomínio>-<nome>.md"; cada parágrafo vira um trecho
export async function indexar(banco: pg.Client, pasta: string): Promise<number> {
  let total = 0;
  for (const arquivo of fs.readdirSync(pasta).sort()) {
    const condominio = Number(arquivo.split("-")[0]);
    const documento = arquivo.replace(/^\d+-/, "").replace(/\.md$/, "");
    const texto = fs.readFileSync(path.join(pasta, arquivo), "utf8");
    for (const paragrafo of texto.split(/\n\s*\n/).map((p) => p.trim())) {
      if (!paragrafo) continue;
      await banco.query(
        "INSERT INTO trechos (condominio_id, documento, texto, embedding) " +
          "VALUES ($1, $2, $3, $4)",
        [condominio, documento, paragrafo, JSON.stringify(vetorizar(paragrafo))],
      );
      total++;
    }
  }
  return total;
}

// A busca do assistente ingênuo: os trechos mais parecidos, de qualquer condomínio
export async function buscarEmTudo(
  banco: pg.Client,
  pergunta: string,
): Promise<Trecho[]> {
  const { rows } = await banco.query(
    `SELECT documento, texto, 1 - (embedding <=> $1) AS similaridade
     FROM trechos ORDER BY embedding <=> $1, id LIMIT 3`,
    [JSON.stringify(vetorizar(pergunta))],
  );
  return rows;
}

// A busca do assistente protegido: o condomínio é obrigatório e entra no filtro. Em
// produção, a política de RLS do capítulo 17 garante o mesmo no próprio banco.
export async function buscarNoCondominio(
  banco: pg.Client,
  condominio: number,
  pergunta: string,
): Promise<Trecho[]> {
  const { rows } = await banco.query(
    `SELECT documento, texto, 1 - (embedding <=> $1) AS similaridade
     FROM trechos WHERE condominio_id = $2
     ORDER BY embedding <=> $1, id LIMIT 3`,
    [JSON.stringify(vetorizar(pergunta)), condominio],
  );
  return rows;
}
