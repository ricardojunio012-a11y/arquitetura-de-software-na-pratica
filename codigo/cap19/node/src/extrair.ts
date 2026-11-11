// Extração (o E do ELT): lê as tabelas do banco transacional e grava cada uma como um
// arquivo CSV na zona bruta. Os dados pessoais são tratados no caminho: o nome do
// morador nem sai da origem, e CPF e placa saem pseudonimizados.
import fs from "node:fs";
import path from "node:path";
import type pg from "pg";
import { pseudonimo } from "./pseudonimo.ts";

type Linha = Record<string, string | number>;

const CONSULTAS: Record<string, string> = {
  condominios: "SELECT id, uf, unidades FROM condominios",
  moradores: "SELECT id, condominio_id, cpf FROM moradores",
  veiculos: "SELECT placa, morador_id FROM veiculos",
  cobrancas:
    "SELECT id, condominio_id, morador_id, to_char(vencimento, 'YYYY-MM-DD') " +
    "AS vencimento, valor_centavos, situacao FROM cobrancas",
};

// Coluna pessoal -> coluna que vai para a zona bruta
const PESSOAIS: Record<string, string> = {
  cpf: "cpf_pseudonimo",
  placa: "placa_pseudonimo",
};

function paraCsv(linhas: Linha[]): string {
  const colunas = Object.keys(linhas[0]);
  const corpo = linhas.map((l) => colunas.map((c) => String(l[c])).join(","));
  return [colunas.join(","), ...corpo].join("\n") + "\n";
}

export async function extrair(
  banco: pg.Client,
  chave: string,
  zonaBruta: string,
): Promise<Record<string, number>> {
  fs.mkdirSync(zonaBruta, { recursive: true });
  const contagens: Record<string, number> = {};
  for (const [tabela, consulta] of Object.entries(CONSULTAS)) {
    const { rows } = await banco.query(consulta + " ORDER BY 1");
    const linhas = rows.map((linha: Linha) => {
      const saida: Linha = {};
      for (const [coluna, valor] of Object.entries(linha)) {
        const pessoal = PESSOAIS[coluna];
        if (pessoal) saida[pessoal] = pseudonimo(chave, String(valor).trim());
        else saida[coluna] = valor;
      }
      return saida;
    });
    fs.writeFileSync(path.join(zonaBruta, `${tabela}.csv`), paraCsv(linhas));
    contagens[tabela] = linhas.length;
  }
  return contagens;
}
