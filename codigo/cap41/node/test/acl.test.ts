// A camada anticorrupção e o comparador da execução paralela, sem banco e sem rede.
import { describe, expect, it } from "vitest";
import {
  centavos,
  dataIso,
  traduzir,
  REGRAS_V1,
  type Legado,
} from "../src/acl/beta.ts";
import { comparar, rotaDe } from "../src/proxy.ts";

const legado: Legado = {
  predios: [
    { cod: "P0101", nome: "RES ACACIAS TORRE A", cnpj: "12.345.678/0001-90" },
    { cod: "P0102", nome: "RES ACACIAS TORRE B", cnpj: "12.345.678/0001-90" },
  ],
  aptos: [
    {
      cod_predio: "P0101",
      apto: "0101",
      tipo: "A",
      fracao: "0,500000",
      vinculo: "",
      obs: "SINDICO",
    },
    {
      cod_predio: "P0102",
      apto: "0101",
      tipo: "A",
      fracao: "0,400000",
      vinculo: "",
      obs: "",
    },
    {
      cod_predio: "P0101",
      apto: "G-01",
      tipo: "G",
      fracao: "0,100000",
      vinculo: "P0102/0101",
      obs: "",
    },
  ],
  orcamentos: [{ comp: "10/2026", valor: "1.000,00" }],
  rateios: [
    {
      cod_predio: "P0102",
      apto: "0101",
      comp: "10/2026",
      vencto: "10/10/2026",
      valor: "1.048,72",
      pago: "S",
      dt_pagto: "05/10/2026",
    },
  ],
};

describe("formatos do legado", () => {
  it("lê valores e datas no formato brasileiro e recusa o resto", () => {
    expect(centavos("1.048,72")).toBe(104872);
    expect(centavos("0,07")).toBe(7);
    expect(() => centavos("1048.72")).toThrow();
    expect(dataIso("05/10/2026")).toBe("2026-10-05");
    expect(() => dataIso("2026-10-05")).toThrow();
  });
});

describe("tradução", () => {
  it("junta as torres num condomínio com blocos e liga a vaga à unidade", () => {
    const t = traduzir(legado, REGRAS_V1);
    expect(t.condominio.id).toBe("c12345678");
    expect(t.unidades.map((u) => u.id)).toEqual([
      "c12345678-A-0101",
      "c12345678-B-0101",
    ]);
    expect(t.vagas).toEqual([
      { id: "c12345678-G-01", unidade_id: "c12345678-B-0101", fracao: "0.100000" },
    ]);
    expect(t.cobrancas[0]).toMatchObject({
      valor_centavos: 104872,
      pago_em: "2026-10-05",
    });
  });

  it("põe em quarentena a vaga sem vínculo, em vez de adivinhar", () => {
    const semVinculo = structuredClone(legado);
    semVinculo.aptos[2].vinculo = "";
    const t = traduzir(semVinculo, REGRAS_V1);
    expect(t.vagas).toEqual([]);
    expect(t.quarentena).toEqual([
      { chave_legado: "P0101/G-01", motivo: "vaga sem unidade vinculada" },
    ]);
    const decidido = { ...REGRAS_V1, vinculos: { "P0101/G-01": "P0101/0101" } };
    expect(traduzir(semVinculo, decidido).vagas[0].unidade_id).toBe("c12345678-A-0101");
  });

  it("só marca a isenção do síndico com a regra da versão 2", () => {
    expect(traduzir(legado, REGRAS_V1).unidades[0].isento).toBe(false);
    const v2 = { ...REGRAS_V1, isencaoPelaObs: true };
    expect(traduzir(legado, v2).unidades[0].isento).toBe(true);
  });
});

describe("comparador da execução paralela", () => {
  const item = (apto: string, valor: string) => ({ apto, comp: "11/2026", valor });

  it("separa arredondamento aceito, diferença e item ausente", () => {
    const velho = [
      item("0101", "0,00"),
      item("0102", "1.258,48"),
      item("G-09", "104,88"),
    ];
    const novo = [item("0101", "1.048,73"), item("0102", "1.258,49")];
    expect(comparar(velho, novo)).toEqual([
      { chave: "0101 11/2026", tipo: "diferente" },
      { chave: "0102 11/2026", tipo: "arredondamento (aceita)" },
      { chave: "G-09 11/2026", tipo: "ausente no Morada" },
    ]);
  });

  it("identifica a rota do contrato antigo", () => {
    expect(rotaDe("GET", "/predios/P0101/rateios?comp=10/2026")).toBe("GET rateios");
    expect(rotaDe("POST", "/predios/P0101/rateios/0101/baixa")).toBe("POST baixa");
    expect(rotaDe("GET", "/relatorios/dimob?ano=2025")).toBe("GET dimob");
  });
});
