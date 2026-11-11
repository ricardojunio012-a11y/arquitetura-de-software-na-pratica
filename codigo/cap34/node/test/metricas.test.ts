import { describe, expect, it } from "vitest";
import { percentilDosBaldes } from "../src/metricas.ts";

describe("percentil estimado pelos baldes", () => {
  it("interpola dentro do balde em que o percentil cai", () => {
    // 100 medidas: 50 até 0,1 s, 40 entre 0,1 e 0,5 s, 10 entre 0,5 e 1 s
    const limites = [0.1, 0.5, 1];
    const contagens = [50, 40, 10, 0];
    expect(percentilDosBaldes(limites, contagens, 0.5)).toBeCloseTo(0.1);
    expect(percentilDosBaldes(limites, contagens, 0.95)).toBeCloseTo(0.75);
  });
});
