// A migração de um cliente do legado para o Morada, e a conferência que diz se ela
// deu certo. A conferência não usa o código da migração: conta e soma dos dois lados,
// em SQL, e exige que legado = Morada + quarentena em cada linha.
import type { PGlite } from "@electric-sql/pglite";
import type { DatabaseSync } from "node:sqlite";
import { lerLegado, traduzir, type Regras, type Traducao } from "./acl/beta.ts";

// Grava a tradução com "insere ou atualiza": rodar duas vezes dá o mesmo resultado
export async function gravar(db: PGlite, t: Traducao): Promise<void> {
  const up = (tabela: string, cols: string[], conflito: string) => {
    const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
    const set = cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");
    return `INSERT INTO ${tabela} (${cols.join(", ")}) VALUES (${ph})
            ON CONFLICT (${conflito}) DO UPDATE SET ${set}`;
  };
  await db.transaction(async (tx) => {
    const { id, nome, cnpj } = t.condominio;
    await tx.query(up("condominios", ["id", "nome", "cnpj"], "id"), [id, nome, cnpj]);
    const colsU = ["id", "condominio_id", "bloco", "numero", "fracao", "isento"];
    for (const u of t.unidades)
      await tx.query(up("unidades", colsU, "id"), [
        u.id,
        id,
        u.bloco,
        u.numero,
        u.fracao,
        u.isento,
      ]);
    for (const v of t.vagas)
      await tx.query(up("vagas", ["id", "unidade_id", "fracao"], "id"), [
        v.id,
        v.unidade_id,
        v.fracao,
      ]);
    const colsO = ["condominio_id", "competencia", "valor_centavos"];
    for (const o of t.orcamentos)
      await tx.query(up("orcamentos", colsO, "condominio_id, competencia"), [
        id,
        o.competencia,
        o.valor_centavos,
      ]);
    const colsC = ["id", "unidade_id", "item", "competencia", "vencimento"];
    colsC.push("valor_centavos", "pago_em");
    for (const c of t.cobrancas)
      await tx.query(up("cobrancas", colsC, "id"), [
        c.id,
        c.unidade_id,
        c.item,
        c.competencia,
        c.vencimento,
        c.valor_centavos,
        c.pago_em,
      ]);
    const colsK = ["chave_legado", "unidade_id", "item"];
    for (const k of t.correspondencia)
      await tx.query(up("acl.correspondencia", colsK, "chave_legado"), [
        k.chave_legado,
        k.unidade_id,
        k.item,
      ]);
    // A quarentena é refeita a cada execução: o que foi resolvido sai dela
    await tx.query("DELETE FROM acl.quarentena WHERE chave_legado LIKE ANY ($1)", [
      [...new Set(t.correspondencia.map((k) => k.chave_legado.split("/")[0] + "/%"))],
    ]);
    for (const q of t.quarentena)
      await tx.query(up("acl.quarentena", ["chave_legado", "motivo"], "chave_legado"), [
        q.chave_legado,
        q.motivo,
      ]);
  });
}

export async function migrar(
  legado: DatabaseSync,
  morada: PGlite,
  cnpj: string,
  ate: string,
  regras: Regras,
): Promise<Traducao> {
  const t = traduzir(lerLegado(legado, cnpj, ate), regras);
  await gravar(morada, t);
  return t;
}

// A cópia ingênua: lê os mesmos dados e converte "do jeito óbvio", sem a camada
export async function migrarIngenuo(
  legado: DatabaseSync,
  morada: PGlite,
  cnpj: string,
  ate: string,
): Promise<void> {
  const l = lerLegado(legado, cnpj, ate);
  const id = "c" + cnpj.replace(/\D/g, "").slice(0, 8);
  await morada.query("INSERT INTO condominios VALUES ($1, $2, $3)", [id, "?", cnpj]);
  for (const a of l.aptos)
    await morada.query("INSERT INTO unidades VALUES ($1, $2, $3, $4, $5, false)", [
      `${a.cod_predio}/${a.apto}`,
      id,
      a.cod_predio,
      a.apto,
      parseFloat(a.fracao.replace(",", ".")),
    ]);
  for (const r of l.rateios) {
    const venc = new Date(r.vencto); // "10/11/2026": o JavaScript lê mês/dia/ano
    const pago = r.pago === "S" ? new Date(r.dt_pagto).toISOString() : null;
    await morada.query(
      "INSERT INTO cobrancas VALUES ($1, $2, 'taxa', $3, $4, $5, $6)",
      [
        `${r.cod_predio}/${r.apto}.${r.comp}`,
        `${r.cod_predio}/${r.apto}`,
        r.comp.split("/").reverse().join("-"),
        venc.toISOString().slice(0, 10),
        Math.round(parseFloat(r.valor.replace(",", ".")) * 100),
        pago?.slice(0, 10),
      ],
    );
  }
}

export type Linha = {
  item: string;
  legado: number;
  morada: number;
  quarentena: number;
};

// A conferência: cada número é calculado de forma independente nos dois bancos
export async function conferir(
  legado: DatabaseSync,
  morada: PGlite,
  cnpj: string,
  ate: string,
): Promise<Linha[]> {
  const id = "c" + cnpj.replace(/\D/g, "").slice(0, 8);
  const comps = `substr(comp, 4) || '-' || substr(comp, 1, 2) <= '${ate}'`;
  const cent = "CAST(replace(replace(valor, '.', ''), ',', '') AS INTEGER)";
  const doLegado = (sql: string) =>
    Number(Object.values(legado.prepare(sql).get(cnpj) as object)[0] ?? 0);
  const predios = "cod_predio IN (SELECT cod FROM predio WHERE cnpj = ?)";
  const doMorada = async (sql: string) => {
    const { rows } = await morada.query<{ n: string }>(sql, [id]);
    return Number(rows[0].n ?? 0);
  };
  const unid =
    "unidade_id IN (SELECT id FROM unidades WHERE condominio_id = $1)" +
    ` AND competencia <= '${ate}'`;
  const rateioQ = `(cod_predio || '/' || apto) IN (${await listaQuarentena(morada)})`;

  const linhas: Linha[] = [];
  const linha = async (item: string, l: string, m: string, q: string) =>
    linhas.push({
      item,
      legado: doLegado(l),
      morada: await doMorada(m),
      quarentena: q ? doLegado(q) : 0,
    });
  await linha(
    "unidades (aptos do tipo A)",
    `SELECT count(*) FROM apto WHERE tipo = 'A' AND ${predios}`,
    "SELECT count(*) n FROM unidades WHERE condominio_id = $1",
    "",
  );
  await linha(
    "vagas (aptos do tipo G)",
    `SELECT count(*) FROM apto WHERE tipo = 'G' AND ${predios}`,
    `SELECT count(*) n FROM vagas
       WHERE unidade_id IN (SELECT id FROM unidades WHERE condominio_id = $1)`,
    `SELECT count(*) FROM apto WHERE tipo = 'G' AND ${predios} AND ${rateioQ}`,
  );
  const ondeR = `WHERE ${predios} AND ${comps}`;
  await linha(
    "cobranças",
    `SELECT count(*) FROM rateio ${ondeR}`,
    `SELECT count(*) n FROM cobrancas WHERE ${unid}`,
    `SELECT count(*) FROM rateio ${ondeR} AND ${rateioQ}`,
  );
  await linha(
    "soma das cobranças (centavos)",
    `SELECT sum(${cent}) FROM rateio ${ondeR}`,
    `SELECT sum(valor_centavos) n FROM cobrancas WHERE ${unid}`,
    `SELECT sum(${cent}) FROM rateio ${ondeR} AND ${rateioQ}`,
  );
  await linha(
    "soma das pagas (centavos)",
    `SELECT sum(${cent}) FROM rateio ${ondeR} AND pago = 'S'`,
    `SELECT sum(valor_centavos) n FROM cobrancas WHERE ${unid} AND pago_em IS NOT NULL`,
    `SELECT sum(${cent}) FROM rateio ${ondeR} AND pago = 'S' AND ${rateioQ}`,
  );
  await linha(
    "vencimentos fora do mês da competência",
    `SELECT count(*) FROM rateio ${ondeR} AND substr(vencto, 4) <> comp`,
    `SELECT count(*) n FROM cobrancas WHERE ${unid}
       AND to_char(vencimento, 'YYYY-MM') <> competencia`,
    "",
  );
  return linhas;
}

async function listaQuarentena(morada: PGlite): Promise<string> {
  const { rows } = await morada.query<{ c: string }>(
    "SELECT chave_legado c FROM acl.quarentena",
  );
  return rows.map((r) => `'${r.c}'`).join(",") || "''";
}
