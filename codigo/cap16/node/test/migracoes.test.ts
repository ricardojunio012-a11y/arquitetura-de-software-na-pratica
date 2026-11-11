// As migrações rodam uma vez cada, em ordem, e uma segunda execução não faz nada.
import { describe, expect, it } from "vitest";
import { conectar, recriarEsquema } from "../src/banco.ts";
import { aplicarMigracoes } from "../src/migracoes.ts";

describe.skipIf(!process.env.BANCO_URL)("migrações", () => {
  it("aplicam cada arquivo uma única vez, em ordem", async () => {
    const banco = await conectar(process.env.BANCO_URL!);
    await recriarEsquema(banco);
    expect(await aplicarMigracoes(banco, "/dados/migracoes")).toEqual([
      "001_cobrancas.sql",
      "002_fundo_de_reserva.sql",
      "003_indice_inadimplencia.sql",
    ]);
    expect(await aplicarMigracoes(banco, "/dados/migracoes")).toEqual([]);
    await banco.end();
  });
});
