// A pseudonimização e o teste que procura dados pessoais em claro no banco analítico.
import { DuckDBInstance } from "@duckdb/node-api";
import { describe, expect, it } from "vitest";
import { pseudonimo } from "../src/pseudonimo.ts";
import { semDadoPessoal } from "../src/qualidade.ts";

describe("dados pessoais", () => {
  it("o pseudônimo é estável e não revela o CPF", () => {
    const a = pseudonimo("chave", "12345678901");
    expect(a).toBe(pseudonimo("chave", "12345678901"));
    expect(a).not.toContain("12345678901");
    expect(pseudonimo("outra chave", "12345678901")).not.toBe(a);
  });

  it("acusa um CPF em claro em qualquer tabela", async () => {
    const con = await (await DuckDBInstance.create(":memory:")).connect();
    await con.run("CREATE TABLE contatos AS SELECT '12345678901' AS documento");
    expect(await semDadoPessoal(con)).toMatch(/^FALHOU.*1 valores/);
  });
});
