// Row-Level Security no PostgreSQL: uma consulta sem filtro só enxerga o condomínio
// da transação, e gravar no condomínio de outro é recusado. A administradora
// enxerga os condomínios que administra, e só eles.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { comoAdministradora, comoCondominio, conectar } from "../src/banco.ts";

describe.skipIf(!process.env.BANCO_URL)("RLS por condomínio", () => {
  it("isola leitura e escrita por condomínio", async () => {
    const admin = await conectar(process.env.BANCO_URL!);
    await admin.query(fs.readFileSync("/dados/sql/esquema.sql", "utf8"));
    await admin.query(fs.readFileSync("/dados/sql/rls.sql", "utf8"));
    const app = await conectar(process.env.APP_BANCO_URL!);
    const { rows } = await comoCondominio(app, 15, () =>
      app.query("SELECT DISTINCT condominio_id FROM cobrancas"),
    );
    expect(rows).toEqual([{ condominio_id: 15 }]);
    const gravar = comoCondominio(app, 15, () =>
      app.query(
        "INSERT INTO cobrancas " +
          "(condominio_id, unidade, morador, valor_centavos, situacao) " +
          "VALUES (20, 'B-1', 'Íris Melo', 61000, 'aberta')",
      ),
    );
    await expect(gravar).rejects.toMatchObject({ code: "42501" });
    await Promise.all([admin.end(), app.end()]);
  });

  it("a administradora vê os condomínios que administra, e só eles", async () => {
    const admin = await conectar(process.env.BANCO_URL!);
    await admin.query(fs.readFileSync("/dados/sql/esquema.sql", "utf8"));
    await admin.query(fs.readFileSync("/dados/sql/rls.sql", "utf8"));
    const app = await conectar(process.env.APP_BANCO_URL!);
    const { rows } = await comoAdministradora(app, 3, () =>
      app.query("SELECT DISTINCT condominio_id FROM cobrancas ORDER BY 1"),
    );
    expect(rows).toEqual([{ condominio_id: 12 }, { condominio_id: 15 }]);
    await Promise.all([admin.end(), app.end()]);
  });
});
