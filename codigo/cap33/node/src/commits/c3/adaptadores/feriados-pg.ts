// Commit c3: os feriados ficam numa tabela do PostgreSQL
import pg from "pg";

const banco = new pg.Pool({ connectionString: process.env.BANCO_URL });

export async function ehFeriado(data: string): Promise<boolean> {
  const r = await banco.query("SELECT 1 FROM feriados WHERE dia = $1", [data]);
  return (r.rowCount ?? 0) > 0;
}
