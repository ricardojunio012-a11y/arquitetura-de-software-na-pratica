// A API do legado da Beta, que o aplicativo dos síndicos e moradores usa. O contrato
// (rotas, nomes e formatos) não pode mudar enquanto houver aplicativo antigo na rua.
import type { DatabaseSync } from "node:sqlite";
import { relogio } from "../comum.ts";
import { partes, type Resposta } from "../http.ts";
import { deTexto, paraTexto } from "./banco.ts";

type Rateio = { apto: string; comp: string; vencto: string; valor: string };
type Linha = Rateio & { pago: string; dt_pagto: string };

// "10/11/2026" vira "2026-11-10", para comparar com a data de hoje
const iso = (d: string) => d.split("/").reverse().join("-");

export function apiLegado(db: DatabaseSync) {
  return async (metodo: string, caminho: string, corpo: unknown): Promise<Resposta> => {
    const { seg, q } = partes(caminho);
    if (seg[0] === "relatorios" && seg[1] === "dimob")
      return { status: 200, corpo: { arquivo: "DIMOB2025.TXT", linhas: 0 } };
    if (seg[0] !== "predios") return { status: 404, corpo: { erro: "ROTA" } };
    const cod = seg[1];
    const predio = db.prepare("SELECT * FROM predio WHERE cod = ?").get(cod) as
      { somente_leitura: string } | undefined;
    if (!predio) return { status: 404, corpo: { erro: "PREDIO NAO ENCONTRADO" } };
    const rota = `${metodo} ${seg[2]}`;

    if (rota === "GET aptos") {
      const sql = "SELECT apto, tipo, fracao FROM apto WHERE cod_predio = ?";
      return { status: 200, corpo: db.prepare(sql + " ORDER BY apto").all(cod) };
    }
    if (rota === "GET rateios") {
      const sql = "SELECT apto, comp, vencto, valor, pago, dt_pagto FROM rateio";
      const linhas = db
        .prepare(sql + " WHERE cod_predio = ? AND comp = ? ORDER BY apto")
        .all(cod, q.get("comp"));
      return { status: 200, corpo: linhas };
    }
    if (rota === "GET inadimplentes") {
      const linhas = db
        .prepare(
          "SELECT * FROM rateio WHERE cod_predio = ? AND pago = 'N' ORDER BY apto",
        )
        .all(cod) as Linha[];
      const vencidas = linhas.filter(
        (r) => iso(r.vencto) < relogio.hoje && r.valor !== "0,00",
      );
      const porApto = new Map<string, { comps: string[]; cent: number }>();
      for (const r of vencidas) {
        const a = porApto.get(r.apto) ?? { comps: [], cent: 0 };
        a.comps.push(r.comp);
        a.cent += Math.round(deTexto(r.valor) * 100);
        porApto.set(r.apto, a);
      }
      const corpo = [...porApto].map(([apto, a]) => ({
        apto,
        comps: a.comps.sort(),
        total: paraTexto(a.cent),
      }));
      return { status: 200, corpo };
    }
    if (metodo === "POST" && predio.somente_leitura === "S")
      return { status: 423, corpo: { ok: "N", erro: "PREDIO MIGRADO" } };
    if (rota === "POST rateios" && seg[4] === "baixa") {
      const { comp, dt_pagto } = corpo as { comp: string; dt_pagto: string };
      const r = db
        .prepare(
          "UPDATE rateio SET pago = 'S', dt_pagto = ? WHERE cod_predio = ? " +
            "AND apto = ? AND comp = ? AND pago = 'N'",
        )
        .run(dt_pagto, cod, seg[3], comp);
      if (r.changes === 0) return { status: 409, corpo: { ok: "N", erro: "JA PAGO" } };
      return { status: 200, corpo: { ok: "S" } };
    }
    if (rota === "POST comunicados") {
      const { titulo } = corpo as { titulo: string };
      const r = db
        .prepare("INSERT INTO comunicado (cod_predio, titulo) VALUES (?, ?)")
        .run(cod, titulo);
      return { status: 200, corpo: { ok: "S", id: Number(r.lastInsertRowid) } };
    }
    return { status: 404, corpo: { erro: "ROTA" } };
  };
}
