// A API do Morada, no vocabulário do Morada: condomínio, unidade, cobrança, aviso.
import type { PGlite } from "@electric-sql/pglite";
import { relogio } from "../comum.ts";
import { partes, type Resposta } from "../http.ts";

const COBRANCA = `SELECT id, unidade_id, item, competencia, vencimento::text,
  valor_centavos, pago_em::text FROM cobrancas`;

export function apiMorada(db: PGlite) {
  return async (metodo: string, caminho: string, corpo: unknown): Promise<Resposta> => {
    const { seg, q } = partes(caminho);
    const rota = `${metodo} ${seg[0]} ${seg[2] ?? ""}`.trim();
    const ok = (corpo: unknown) => ({ status: 200, corpo });

    if (rota === "GET condominios unidades") {
      const { rows } = await db.query(
        `SELECT u.id, u.bloco, u.numero, u.fracao::text, u.isento,
           coalesce(json_agg(json_build_object('id', v.id, 'fracao', v.fracao::text)
             ORDER BY v.id) FILTER (WHERE v.id IS NOT NULL), '[]') vagas
         FROM unidades u LEFT JOIN vagas v ON v.unidade_id = u.id
         WHERE u.condominio_id = $1 GROUP BY u.id ORDER BY u.id`,
        [seg[1]],
      );
      return ok(rows);
    }
    if (rota === "GET condominios cobrancas") {
      const { rows } = await db.query(
        `${COBRANCA} WHERE competencia = $2 AND unidade_id IN
           (SELECT id FROM unidades WHERE condominio_id = $1) ORDER BY id`,
        [seg[1], q.get("competencia")],
      );
      return ok(rows);
    }
    if (rota === "GET condominios inadimplencia") {
      const { rows } = await db.query(
        `${COBRANCA} WHERE pago_em IS NULL AND valor_centavos > 0 AND vencimento < $2
           AND unidade_id IN (SELECT id FROM unidades WHERE condominio_id = $1)
         ORDER BY id`,
        [seg[1], relogio.hoje],
      );
      return ok(rows);
    }
    if (rota === "POST cobrancas pagamento") {
      const { pago_em } = corpo as { pago_em: string };
      const r = await db.query(
        "UPDATE cobrancas SET pago_em = $2 WHERE id = $1 AND pago_em IS NULL",
        [seg[1], pago_em],
      );
      if (r.affectedRows === 0) return { status: 409, corpo: { erro: "já paga" } };
      return ok({ paga: true });
    }
    if (rota === "POST condominios avisos") {
      const { titulo } = corpo as { titulo: string };
      const { rows } = await db.query<{ id: number }>(
        "INSERT INTO avisos (condominio_id, titulo) VALUES ($1, $2) RETURNING id",
        [seg[1], titulo],
      );
      return ok({ id: rows[0].id });
    }
    return { status: 404, corpo: { erro: "rota desconhecida" } };
  };
}
