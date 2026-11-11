// O fundo de reserva: a formatação em reais e duas saídas simultâneas com a linha
// do fundo travada, que nunca deixam o saldo negativo.
import { describe, expect, it } from "vitest";
import { conectar, recriarEsquema } from "../src/banco.ts";
import { prepararFundo, reais, registrarSaida, saldo } from "../src/fundo.ts";
import { aplicarMigracoes } from "../src/migracoes.ts";

describe("reais", () => {
  it("formata centavos com separador de milhar e sinal", () => {
    expect(reais(100000)).toBe("1.000,00");
    expect(reais(-30000)).toBe("-300,00");
    expect(reais(5)).toBe("0,05");
  });
});

describe.skipIf(!process.env.BANCO_URL)("fundo de reserva no PostgreSQL", () => {
  it("saídas simultâneas com trava não deixam o saldo negativo", async () => {
    const url = process.env.BANCO_URL!;
    const banco = await conectar(url);
    await recriarEsquema(banco);
    await aplicarMigracoes(banco, "/dados/migracoes");
    await prepararFundo(banco);
    const a = await conectar(url);
    const b = await conectar(url);
    const resultados = await Promise.all([
      registrarSaida(a, 1, 70000, "conserto do portão"),
      registrarSaida(b, 1, 60000, "pintura da fachada"),
    ]);
    expect(resultados.filter(Boolean)).toHaveLength(1);
    expect(await saldo(banco, 1)).toBeGreaterThanOrEqual(0);
    await Promise.all([a.end(), b.end(), banco.end()]);
  });
});
