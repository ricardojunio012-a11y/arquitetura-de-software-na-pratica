// O modelo que varia: a mesma semente repete a sequência, e a reformulação muda a
// forma sem mudar o conteúdo.
import { describe, expect, it } from "vitest";
import { reformular, sorteador } from "../src/modelo-variavel.ts";

describe("modelo que varia", () => {
  it("a mesma semente dá a mesma sequência de sorteios", () => {
    const a = sorteador(7);
    const b = sorteador(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("reformula a forma e mantém o conteúdo", () => {
    expect(reformular("O silêncio vai das 22h às 8h.")).toBe(
      "O silêncio vai das 22 horas às 8 horas.",
    );
    expect(reformular("A taxa é de R$ 180,00.")).toBe("A taxa é de 180 reais.");
  });
});
