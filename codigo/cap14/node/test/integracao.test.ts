// Testes de integração: o repositório contra um PostgreSQL real, em contêiner.
import { describe, expect, it } from "vitest";
import { AvisosNoPostgres } from "../src/comunicacao/postgres.ts";

describe.skipIf(!process.env.BANCO_URL)("integração: avisos no PostgreSQL", () => {
  it("grava um aviso e o encontra depois", async () => {
    const { avisos, fechar } = await AvisosNoPostgres.conectar(process.env.BANCO_URL!);
    expect(await avisos.jaEnviado("E-1")).toBe(false);
    await avisos.registrar("E-1", "pagamento recebido");
    expect(await avisos.jaEnviado("E-1")).toBe(true);
    await fechar();
  });

  it("o banco recusa o mesmo aviso duas vezes", async () => {
    const { avisos, fechar } = await AvisosNoPostgres.conectar(process.env.BANCO_URL!);
    await avisos.registrar("E-1", "pagamento recebido");
    await expect(avisos.registrar("E-1", "pagamento recebido")).rejects.toThrow();
    await fechar();
  });
});
