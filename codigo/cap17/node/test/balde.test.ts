// O balde de fichas: deixa passar a rajada, recusa o excesso e se recompõe com o
// tempo.
import { describe, expect, it } from "vitest";
import { BaldeDeFichas } from "../src/balde.ts";

describe("balde de fichas", () => {
  it("permite a rajada, recusa o excesso e ganha fichas com o tempo", () => {
    const balde = new BaldeDeFichas(10, 20);
    const rajada = Array.from({ length: 10 }, () => balde.permite(0));
    expect(rajada.every(Boolean)).toBe(true);
    expect(balde.permite(0)).toBe(false);
    // 20 fichas por segundo: uma ficha a cada 50 ms
    expect(balde.permite(49)).toBe(false);
    expect(balde.permite(99)).toBe(true);
  });
});
