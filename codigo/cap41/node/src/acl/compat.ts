// O outro sentido da camada anticorrupção: atende o contrato antigo da Beta com os
// dados do Morada. O aplicativo da Beta continua chamando as mesmas rotas e recebendo
// o mesmo formato, sem saber quem respondeu (compatibilidade retroativa).
import type { PGlite } from "@electric-sql/pglite";
import { chamar, partes, type Resposta } from "../http.ts";

type Cobranca = {
  id: string;
  unidade_id: string;
  item: string;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  pago_em: string | null;
};
type Unidade = { id: string; fracao: string; vagas: { id: string; fracao: string }[] };

const texto = (cent: number) =>
  (cent / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+,)/g, ".");
const br = (iso: string) => iso.split("-").reverse().join("/");
const fracaoBr = (f: string) => Number(f).toFixed(6).replace(".", ",");

export function compatBeta(morada: string, acl: PGlite) {
  // A correspondência de chaves: "P0101/G-03" <-> (unidade, item) no Morada
  async function chaves(cod: string) {
    const { rows } = await acl.query<{
      chave_legado: string;
      unidade_id: string;
      item: string;
    }>("SELECT * FROM acl.correspondencia WHERE chave_legado LIKE $1 ORDER BY 1", [
      cod + "/%",
    ]);
    const porItem = new Map(
      rows.map((r) => [`${r.unidade_id}|${r.item}`, r.chave_legado]),
    );
    const condominio = rows[0]?.unidade_id.split("-")[0];
    return {
      rows,
      condominio,
      apto: (c: Cobranca) => porItem.get(`${c.unidade_id}|${c.item}`),
    };
  }

  return async (metodo: string, caminho: string, corpo: unknown): Promise<Resposta> => {
    const { seg, q } = partes(caminho);
    const cod = seg[1];
    const k = await chaves(cod);
    if (!k.condominio) return { status: 404, corpo: { erro: "PREDIO NAO ENCONTRADO" } };
    const rota = `${metodo} ${seg[2]}`;
    const ler = async <T>(c: string) => (await chamar(morada, "GET", c)).corpo as T;

    if (rota === "GET aptos") {
      const unidades = await ler<Unidade[]>(`/condominios/${k.condominio}/unidades`);
      const fracoes = new Map<string, string>();
      for (const u of unidades) {
        fracoes.set(`${u.id}|taxa`, u.fracao);
        for (const v of u.vagas) fracoes.set(`${u.id}|${v.id}`, v.fracao);
      }
      const corpo = k.rows.map((r) => ({
        apto: r.chave_legado.split("/")[1],
        tipo: r.item === "taxa" ? "A" : "G",
        fracao: fracaoBr(fracoes.get(`${r.unidade_id}|${r.item}`)!),
      }));
      return { status: 200, corpo };
    }
    if (rota === "GET rateios") {
      const comp = q.get("comp")!.split("/").reverse().join("-");
      const url = `/condominios/${k.condominio}/cobrancas?competencia=${comp}`;
      const corpo = (await ler<Cobranca[]>(url))
        .filter((c) => k.apto(c))
        .map((c) => ({
          apto: k.apto(c)!.split("/")[1],
          comp: q.get("comp"),
          vencto: br(c.vencimento),
          valor: texto(c.valor_centavos),
          pago: c.pago_em ? "S" : "N",
          dt_pagto: c.pago_em ? br(c.pago_em) : "",
        }))
        .sort((a, b) => (a.apto < b.apto ? -1 : 1));
      return { status: 200, corpo };
    }
    if (rota === "GET inadimplentes") {
      const abertas = await ler<Cobranca[]>(
        `/condominios/${k.condominio}/inadimplencia`,
      );
      const porApto = new Map<string, { comps: string[]; cent: number }>();
      for (const c of abertas.filter((c) => k.apto(c))) {
        const apto = k.apto(c)!.split("/")[1];
        const a = porApto.get(apto) ?? { comps: [], cent: 0 };
        a.comps.push(c.competencia.split("-").reverse().join("/"));
        a.cent += c.valor_centavos;
        porApto.set(apto, a);
      }
      const corpo = [...porApto]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([apto, a]) => ({ apto, comps: a.comps.sort(), total: texto(a.cent) }));
      return { status: 200, corpo };
    }
    if (rota === "POST rateios" && seg[4] === "baixa") {
      const { comp, dt_pagto } = corpo as { comp: string; dt_pagto: string };
      const r = k.rows.find((r) => r.chave_legado === `${cod}/${seg[3]}`);
      if (!r) return { status: 404, corpo: { ok: "N", erro: "APTO NAO ENCONTRADO" } };
      const alvo = r.item === "taxa" ? r.unidade_id : r.item;
      const id = `${alvo}.${comp.split("/").reverse().join("-")}`;
      const pago_em = dt_pagto.split("/").reverse().join("-");
      const res = await chamar(morada, "POST", `/cobrancas/${id}/pagamento`, {
        pago_em,
      });
      if (res.status === 409)
        return { status: 409, corpo: { ok: "N", erro: "JA PAGO" } };
      return { status: 200, corpo: { ok: "S" } };
    }
    if (rota === "POST comunicados") {
      const { titulo } = corpo as { titulo: string };
      const r = await chamar(morada, "POST", `/condominios/${k.condominio}/avisos`, {
        titulo,
      });
      return { status: 200, corpo: { ok: "S", id: (r.corpo as { id: number }).id } };
    }
    return { status: 404, corpo: { erro: "ROTA" } };
  };
}
