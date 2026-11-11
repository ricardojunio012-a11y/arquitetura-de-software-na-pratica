import { describe, expect, it } from "vitest";
import { custoComCompromisso, perfil } from "../src/compromisso.ts";
import {
  custoMensal,
  instalacoes,
  multiplicadorDoBanco,
  nosDaInstalacao,
  somar,
} from "../src/modelo.ts";

describe("degraus", () => {
  it("o banco dobra de tamanho quando passa da capacidade", () => {
    expect(multiplicadorDoBanco(3000)).toBe(1);
    expect(multiplicadorDoBanco(4001)).toBe(2);
    expect(multiplicadorDoBanco(30_000)).toBe(8);
  });

  it("toda instalação tem pelo menos dois nós, um em cada zona", () => {
    expect(nosDaInstalacao(400)).toBe(2);
    expect(nosDaInstalacao(30_000)).toBe(20);
  });
});

describe("arquiteturas", () => {
  it("as instalações somam todos os condomínios", () => {
    for (const arq of ["pool", "celulas", "silos"] as const) {
      const soma = instalacoes(arq, 30_000).reduce((s, i) => s + i.condominios, 0);
      expect(soma).toBe(30_000);
    }
  });

  it("os silos separam 20% dos condomínios em grupos de até 400", () => {
    const lista = instalacoes("silos", 3000);
    expect(lista.map((i) => i.condominios)).toEqual([2400, 400, 200]);
  });

  it("uma linha fixa não muda com 10 vezes mais condomínios", () => {
    const fixas = (n: number) =>
      custoMensal("pool", n).filter((l) => l.comportamento === "fixo");
    expect(somar(fixas(30_000))).toBe(somar(fixas(3000)));
  });

  it("uma linha linear cresce exatamente 10 vezes", () => {
    const linear = (n: number) =>
      custoMensal("celulas", n).find((l) => l.nome === "logs e rastros")!.valor;
    expect(linear(30_000) / linear(3000)).toBeCloseTo(10);
  });
});

describe("compromisso", () => {
  it("comprometer a base do uso é mais barato que não comprometer nada", () => {
    const horas = perfil();
    const nada = custoComCompromisso(horas, 0, 0.0884);
    const base = custoComCompromisso(horas, 2, 0.0884);
    const pico = custoComCompromisso(horas, 6, 0.0884);
    expect(base).toBeLessThan(nada);
    expect(pico).toBeGreaterThan(nada);
  });
});
