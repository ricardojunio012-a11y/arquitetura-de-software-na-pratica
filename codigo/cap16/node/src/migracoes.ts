// Migrações versionadas: cada arquivo de migracoes/ roda uma única vez, em ordem, e
// fica registrado na tabela migracoes_aplicadas. Um arquivo que começa com
// "-- sem transação" roda fora de transação (CREATE INDEX CONCURRENTLY exige isso).
import fs from "node:fs";
import path from "node:path";
import type pg from "pg";

export async function aplicarMigracoes(
  banco: pg.Client,
  pasta: string,
  ate = Infinity,
): Promise<string[]> {
  await banco.query(`CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
    versao text PRIMARY KEY,
    aplicada_em timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await banco.query("SELECT versao FROM migracoes_aplicadas");
  const feitas = new Set(rows.map((r) => r.versao));
  const aplicadas: string[] = [];
  const arquivos = fs
    .readdirSync(pasta)
    .filter((a) => a.endsWith(".sql"))
    .sort();
  for (const arquivo of arquivos) {
    if (parseInt(arquivo) > ate) break;
    if (feitas.has(arquivo)) continue;
    const sql = fs.readFileSync(path.join(pasta, arquivo), "utf8");
    const registrar = "INSERT INTO migracoes_aplicadas (versao) VALUES ($1)";
    if (sql.startsWith("-- sem transação")) {
      await banco.query(sql);
      await banco.query(registrar, [arquivo]);
    } else {
      // A migração e o seu registro entram juntos, ou nenhum dos dois
      await banco.query("BEGIN");
      try {
        await banco.query(sql);
        await banco.query(registrar, [arquivo]);
        await banco.query("COMMIT");
      } catch (erro) {
        await banco.query("ROLLBACK");
        throw erro;
      }
    }
    aplicadas.push(arquivo);
  }
  return aplicadas;
}
