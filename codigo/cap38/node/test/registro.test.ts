// O validador do registro de decisões
import { describe, expect, it } from "vitest";
import { lerAdr, SECOES, validar } from "../src/adr.ts";

function adr(numero: string, campos: string[], secoes = SECOES): string {
  return [
    `# ADR-${numero}: Uma decisão`,
    "",
    ...campos.map((c) => `- ${c}`),
    "",
    ...secoes.flatMap((s) => [`## ${s}`, "", "Texto.", ""]),
  ].join("\n");
}
const aceito = ["Situação: aceito", "Data: 2026-01-10"];

describe("validar", () => {
  it("aceita uma substituição registrada nos dois sentidos", () => {
    const antigo = lerAdr(
      "adr-001-a.md",
      adr("001", ["Situação: substituído por ADR-002", "Data: 2026-01-10"]),
    );
    const novo = lerAdr("adr-002-b.md", adr("002", [...aceito, "Substitui: ADR-001"]));
    expect(validar([antigo, novo])).toEqual([]);
  });

  it("aponta a substituição de mão única", () => {
    const antigo = lerAdr("adr-001-a.md", adr("001", aceito));
    const novo = lerAdr("adr-002-b.md", adr("002", [...aceito, "Substitui: ADR-001"]));
    expect(validar([antigo, novo])).toEqual([
      'ADR-002: substitui ADR-001, que continua "aceito"',
    ]);
  });

  it("aponta título e arquivo com números diferentes", () => {
    const a = lerAdr("adr-029-a.md", adr("028", aceito));
    expect(validar([a])).toEqual(["adr-029-a.md: o título diz ADR-028"]);
  });

  it("aponta seção ausente e seções fora de ordem", () => {
    const falta = lerAdr("adr-001-a.md", adr("001", aceito, SECOES.slice(0, 4)));
    const ordem = lerAdr("adr-002-b.md", adr("002", aceito, [...SECOES].reverse()));
    expect(validar([falta, ordem])).toEqual([
      'adr-001-a.md: falta a seção "Quando revisitar"',
      "adr-002-b.md: seções fora de ordem",
    ]);
  });

  it("recusa uma função de aptidão ligada a um ADR que não está em vigor", () => {
    const a = lerAdr(
      "adr-001-a.md",
      adr("001", ["Situação: proposto", "Data: 2026-01-10"]),
    );
    expect(validar([a], [{ funcao: "f", adr: 1 }])).toEqual([
      'função f: ADR-001 está "proposto"',
    ]);
  });
});
