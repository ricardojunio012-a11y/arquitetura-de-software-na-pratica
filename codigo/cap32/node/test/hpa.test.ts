import { describe, expect, it } from "vitest";
import { ControladorHpa, recomendar } from "../src/hpa.ts";

const prontas = (n: number, uso: number) => Array(n).fill(uso);

describe("o cálculo do HPA", () => {
  it("segue a fórmula: teto(atuais × atual / desejado)", () => {
    // 4 réplicas a 90% com alvo de 60%: 4 × 1,5 = 6
    expect(
      recomendar({ atuais: 4, usoProntas: prontas(4, 90), naoProntas: 0 }, 60),
    ).toBe(6);
    // 10 réplicas a 30%: 10 × 0,5 = 5
    expect(
      recomendar({ atuais: 10, usoProntas: prontas(10, 30), naoProntas: 0 }, 60),
    ).toBe(5);
  });

  it("não mexe dentro da tolerância de 10%", () => {
    expect(
      recomendar({ atuais: 4, usoProntas: prontas(4, 65), naoProntas: 0 }, 60),
    ).toBe(4);
  });

  it("conta como 0% as réplicas que ainda sobem, se o cálculo pede subir", () => {
    // 4 prontas a 120% e 4 subindo: (480 / 8) / 60 = 1, não sobe mais
    expect(
      recomendar({ atuais: 8, usoProntas: prontas(4, 120), naoProntas: 4 }, 60),
    ).toBe(8);
    // 4 prontas a 150% e 2 subindo: (600 / 6) / 60 = 1,67 → teto(1,67 × 6) = 10
    expect(
      recomendar({ atuais: 6, usoProntas: prontas(4, 150), naoProntas: 2 }, 60),
    ).toBe(10);
  });
});

describe("o controlador", () => {
  const cfg = { minimo: 3, maximo: 30, alvo: 60, janelaReducao: 300 };

  it("sobe no máximo o dobro ou 4 a mais por ciclo, o que for maior", () => {
    const hpa = new ControladorHpa(cfg);
    expect(
      hpa.ciclo(0, { atuais: 3, usoProntas: prontas(3, 160), naoProntas: 0 }),
    ).toBe(7);
    expect(
      hpa.ciclo(0, { atuais: 10, usoProntas: prontas(10, 160), naoProntas: 0 }),
    ).toBe(20);
  });

  it("só desce depois da janela de estabilização", () => {
    const hpa = new ControladorHpa(cfg);
    const m = (uso: number) => ({
      atuais: 10,
      usoProntas: prontas(10, uso),
      naoProntas: 0,
    });
    expect(hpa.ciclo(0, m(60))).toBe(10);
    expect(hpa.ciclo(15, m(30))).toBe(10); // a recomendação de 10 ainda está na janela
    expect(hpa.ciclo(300, m(30))).toBe(5); // a de t = 0 saiu da janela
  });

  it("respeita o mínimo e o máximo", () => {
    const hpa = new ControladorHpa(cfg);
    expect(
      hpa.ciclo(0, { atuais: 28, usoProntas: prontas(28, 160), naoProntas: 0 }),
    ).toBe(30);
    expect(
      hpa.ciclo(0, { atuais: 3, usoProntas: prontas(3, 60), naoProntas: 0 }, 20),
    ).toBe(20);
  });
});
