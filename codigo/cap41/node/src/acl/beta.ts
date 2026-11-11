// A camada anticorrupção entre a Beta e o Morada. Só este arquivo e o compat.ts
// conhecem os dois modelos. Ela traduz vocabulário (prédio, apto, rateio), formatos
// ("1.048,72", "10/11/2026", "0,036496") e, principalmente, conceitos: para a Beta,
// cada torre é um cliente e a vaga de garagem é um apto; para o Morada, o condomínio
// é um só, com blocos, e a vaga pertence a uma unidade.
import type { DatabaseSync } from "node:sqlite";

export type LegadoPredio = { cod: string; nome: string; cnpj: string };
export type LegadoApto = {
  cod_predio: string;
  apto: string;
  tipo: string;
  fracao: string;
  vinculo: string;
  obs: string;
};
export type LegadoRateio = {
  cod_predio: string;
  apto: string;
  comp: string;
  vencto: string;
  valor: string;
  pago: string;
  dt_pagto: string;
};
export type Legado = {
  predios: LegadoPredio[];
  aptos: LegadoApto[];
  orcamentos: { comp: string; valor: string }[];
  rateios: LegadoRateio[];
};

export type Regras = {
  isencaoPelaObs: boolean; // a regra escondida no texto livre (seção 41.5)
  vinculos: Record<string, string>; // vagas sem vínculo, decididas pelo síndico
};
export const REGRAS_V1: Regras = { isencaoPelaObs: false, vinculos: {} };

export type Traducao = {
  condominio: { id: string; nome: string; cnpj: string };
  unidades: {
    id: string;
    bloco: string;
    numero: string;
    fracao: string;
    isento: boolean;
  }[];
  vagas: { id: string; unidade_id: string; fracao: string }[];
  orcamentos: { competencia: string; valor_centavos: number }[];
  cobrancas: {
    id: string;
    unidade_id: string;
    item: string;
    competencia: string;
    vencimento: string;
    valor_centavos: number;
    pago_em: string | null;
  }[];
  correspondencia: { chave_legado: string; unidade_id: string; item: string }[];
  quarentena: { chave_legado: string; motivo: string }[];
};

// Formatos: cada conversão num lugar só, e recusando o que não reconhece
export function centavos(valor: string): number {
  if (!/^\d{1,3}(\.\d{3})*,\d{2}$/.test(valor)) throw new Error(`valor: ${valor}`);
  return Number(valor.replace(/\./g, "").replace(",", ""));
}
export function dataIso(data: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!m) throw new Error(`data: ${data}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}
export const competencia = (comp: string) => comp.split("/").reverse().join("-");
export const fracao = (f: string) => f.replace(",", ".");

export function lerLegado(db: DatabaseSync, cnpj: string, ate: string): Legado {
  const predios = db
    .prepare("SELECT cod, nome, cnpj FROM predio WHERE cnpj = ? ORDER BY cod")
    .all(cnpj) as LegadoPredio[];
  const cods = predios.map((p) => `'${p.cod}'`).join(",");
  const aptos = db
    .prepare(`SELECT * FROM apto WHERE cod_predio IN (${cods}) ORDER BY 1, 2`)
    .all() as LegadoApto[];
  const orcamentos = db
    .prepare("SELECT comp, valor FROM orcamento WHERE cnpj = ? ORDER BY comp")
    .all(cnpj) as { comp: string; valor: string }[];
  const rateios = (
    db
      .prepare(`SELECT * FROM rateio WHERE cod_predio IN (${cods}) ORDER BY 1, 2, 3`)
      .all() as LegadoRateio[]
  ).filter((r) => competencia(r.comp) <= ate);
  return { predios, aptos, orcamentos, rateios };
}

export function traduzir(legado: Legado, regras: Regras): Traducao {
  const p0 = legado.predios[0];
  const id = "c" + p0.cnpj.replace(/\D/g, "").slice(0, 8);
  // "RES ACACIAS TORRE A" vira o condomínio "RES ACACIAS" com o bloco "A"
  const nome = p0.nome.replace(/ TORRE \w+$/, "");
  const bloco = new Map(
    legado.predios.map((p) => [p.cod, /TORRE (\w+)$/.exec(p.nome)?.[1] ?? "U"]),
  );
  const t: Traducao = {
    condominio: { id, nome, cnpj: p0.cnpj },
    unidades: [],
    vagas: [],
    orcamentos: legado.orcamentos.map((o) => ({
      competencia: competencia(o.comp),
      valor_centavos: centavos(o.valor),
    })),
    cobrancas: [],
    correspondencia: [],
    quarentena: [],
  };
  const unidadeDe = (chave: string) => {
    const [cod, apto] = chave.split("/");
    return `${id}-${bloco.get(cod)}-${apto}`;
  };

  for (const a of legado.aptos) {
    const chave = `${a.cod_predio}/${a.apto}`;
    if (a.tipo === "A") {
      const isento = regras.isencaoPelaObs && a.obs.toUpperCase().includes("SINDICO");
      const u = {
        id: unidadeDe(chave),
        bloco: bloco.get(a.cod_predio)!,
        numero: a.apto,
      };
      t.unidades.push({ ...u, fracao: fracao(a.fracao), isento });
      t.correspondencia.push({ chave_legado: chave, unidade_id: u.id, item: "taxa" });
    } else if (a.tipo === "G") {
      const vinculo = a.vinculo || regras.vinculos[chave];
      if (!vinculo) {
        t.quarentena.push({
          chave_legado: chave,
          motivo: "vaga sem unidade vinculada",
        });
        continue;
      }
      const vaga = { id: `${id}-${a.apto}`, unidade_id: unidadeDe(vinculo) };
      t.vagas.push({ ...vaga, fracao: fracao(a.fracao) });
      const { unidade_id } = vaga;
      t.correspondencia.push({ chave_legado: chave, unidade_id, item: vaga.id });
    } else {
      t.quarentena.push({
        chave_legado: chave,
        motivo: `tipo desconhecido: ${a.tipo}`,
      });
    }
  }

  const destino = new Map(t.correspondencia.map((c) => [c.chave_legado, c]));
  for (const r of legado.rateios) {
    const c = destino.get(`${r.cod_predio}/${r.apto}`);
    if (!c) continue; // o apto está em quarentena, e o rateio fica com ele
    const comp = competencia(r.comp);
    t.cobrancas.push({
      id: `${c.item === "taxa" ? c.unidade_id : c.item}.${comp}`,
      unidade_id: c.unidade_id,
      item: c.item,
      competencia: comp,
      vencimento: dataIso(r.vencto),
      valor_centavos: centavos(r.valor),
      pago_em: r.pago === "S" ? dataIso(r.dt_pagto) : null,
    });
  }
  return t;
}
