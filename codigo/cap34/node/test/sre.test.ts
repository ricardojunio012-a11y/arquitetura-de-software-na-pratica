import { describe, expect, it } from "vitest";
import { REGRAS, Serie, disparando, episodios, taxaDeConsumo } from "../src/sre.ts";

describe("taxa de consumo", () => {
  it("vale 1 quando os erros são exatamente o que o SLO permite", () => {
    expect(taxaDeConsumo(1, 1000, 0.999)).toBeCloseTo(1);
    expect(taxaDeConsumo(72, 5000, 0.999)).toBeCloseTo(14.4);
    expect(taxaDeConsumo(0, 0, 0.999)).toBe(0);
  });
});

describe("alerta multi-janela", () => {
  const pagina = REGRAS[0]; // 1 h e 5 min, 14,4x, com SLO de 99,9%

  it("dispara só quando a janela longa e a curta passam do limiar", () => {
    const s = new Serie();
    for (let m = 0; m < 60; m++) s.acrescentar(1000, m < 50 ? 20 : 0);
    // a hora inteira gastou rápido, mas os últimos 10 minutos estão limpos
    expect(disparando(s, pagina, 0.999, 50)).toBe(true);
    expect(disparando(s, pagina, 0.999, 60)).toBe(false);
  });

  it("não dispara com um pico curto que gasta pouco do orçamento", () => {
    const s = new Serie();
    for (let m = 0; m < 60; m++) s.acrescentar(1000, m === 30 ? 300 : 0);
    expect(disparando(s, pagina, 0.999, 31)).toBe(false);
  });

  it("junta numa notificação um alerta que volta logo depois de parar", () => {
    const s = new Serie();
    for (let m = 0; m < 100; m++) s.acrescentar(1, 0);
    const ligado = (m: number) => (m >= 10 && m < 20) || (m >= 30 && m < 40) || m >= 80;
    expect(episodios(s, ligado)).toEqual([
      { inicio: 10, fim: 40 },
      { inicio: 80, fim: 100 },
    ]);
  });
});
