// A expiração antecipada: longe do vencimento, quase nunca recalcula; perto dele,
// quase sempre; depois dele, sempre.
import { describe, expect, it } from "vitest";
import { deveRecalcular, sorteador } from "../src/antecipada.ts";

function taxa(agora: number) {
  const sorteio = sorteador(1);
  const vezes = Array.from({ length: 1000 }, () =>
    deveRecalcular(agora, 60, 2, 1, sorteio()),
  );
  return vezes.filter(Boolean).length / 1000;
}

describe("expiração antecipada probabilística", () => {
  it("a chance de recalcular cresce perto do vencimento", () => {
    expect(taxa(30)).toBeLessThan(0.01);
    expect(taxa(59)).toBeGreaterThan(0.3);
    expect(taxa(60)).toBe(1);
  });
});
