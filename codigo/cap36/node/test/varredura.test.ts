import { describe, expect, it } from "vitest";
import { varrerTexto } from "../src/varredura.ts";

describe("varredura de segredos", () => {
  it("acha o segredo e mostra só o começo dele", () => {
    const [a] = varrerTexto("x.ts", 'const apiToken = "abcd1234efgh";');
    expect(a.regra).toBe("segredo em texto");
    expect(a.amostra).toBe("abcd…");
  });

  it("acha a senha dentro de uma URL de conexão", () => {
    const achados = varrerTexto("x.ts", 'const u = "postgres://app:S3nh4F0rte@db/x";');
    expect(achados.map((a) => a.regra)).toEqual(["URL com senha"]);
  });

  it("não acusa a leitura do segredo em tempo de execução", () => {
    expect(varrerTexto("x.ts", 'const segredo = lerSegredo("integracao");')).toEqual(
      [],
    );
    expect(varrerTexto("x.ts", "const u = `pg://app:${segredo()}@db/x`;")).toEqual([]);
  });
});
