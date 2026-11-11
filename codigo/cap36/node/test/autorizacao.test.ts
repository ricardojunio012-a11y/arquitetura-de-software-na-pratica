import { describe, expect, it } from "vitest";
import { papelPermite, Relacoes } from "../src/autorizacao.ts";
import { boletos, pessoas, tuplas } from "../src/dados.ts";

const relacoes = new Relacoes(tuplas);
const lidos = (id: string, papeis: string[]) =>
  boletos.filter((b) => relacoes.podeLerBoleto({ id, papeis }, b)).map((b) => b.id);

describe("autorização por relação (mini-Zanzibar)", () => {
  it("a moradora lê só o boleto da própria unidade", () => {
    expect(lidos(pessoas.ana, ["morador"])).toEqual(["B-1001"]);
  });

  it("o síndico lê os boletos do próprio condomínio", () => {
    expect(lidos(pessoas.bruno, ["sindico"])).toEqual([
      "B-1001",
      "B-1002",
      "B-1003",
      "B-1004",
    ]);
  });

  it("a administradora lê os condomínios que administra, como membro", () => {
    expect(lidos(pessoas.dora, ["administradora"])).toHaveLength(8);
    expect(lidos("cliente:integracao-adm1", ["administradora"])).toHaveLength(8);
  });

  it("a porteira não lê boletos, nem pelo papel nem pela relação", () => {
    expect(papelPermite({ id: pessoas.carla, papeis: ["porteiro"] })).toBe(false);
    expect(lidos(pessoas.carla, ["porteiro"])).toEqual([]);
  });

  it("um ciclo nas relações não trava a verificação", () => {
    const ciclo = new Relacoes([
      "grupo:a#membro@grupo:b#membro",
      "grupo:b#membro@grupo:a#membro",
    ]);
    expect(ciclo.tem("grupo:a", "membro", "x")).toBe(false);
  });
});
