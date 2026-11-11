import { describe, expect, it } from "vitest";
import { ativa } from "../src/flags.ts";

const condominios = Array.from({ length: 3_000 }, (_, i) => i + 1);
const contar = (flag: string, percentual: number) =>
  condominios.filter((c) =>
    ativa(flag, { ligada: true, condominios: [], percentual }, c),
  );

describe("feature flags por condomínio", () => {
  it("um percentual liga perto dessa fração dos condomínios", () => {
    const ligados = contar("celula-dedicada", 10).length;
    expect(ligados).toBeGreaterThan(250);
    expect(ligados).toBeLessThan(350);
  });
  it("subir o percentual só acrescenta condomínios", () => {
    const antes = contar("celula-dedicada", 10);
    const depois = new Set(contar("celula-dedicada", 20));
    expect(antes.every((c) => depois.has(c))).toBe(true);
  });
  it("flags diferentes sorteiam grupos diferentes", () => {
    const a = new Set(contar("celula-dedicada", 10));
    const b = contar("novo-boleto", 10);
    expect(b.filter((c) => a.has(c)).length).toBeLessThan(b.length / 2);
  });
  it("a lista liga um condomínio fora do percentual", () => {
    const regra = { ligada: true, condominios: [7], percentual: 0 };
    expect(ativa("celula-dedicada", regra, 7)).toBe(true);
    expect(ativa("celula-dedicada", regra, 8)).toBe(false);
  });
  it("desligada, não liga para ninguém, nem para quem está na lista", () => {
    const regra = { ligada: false, condominios: [7], percentual: 100 };
    expect(ativa("celula-dedicada", regra, 7)).toBe(false);
  });
});
