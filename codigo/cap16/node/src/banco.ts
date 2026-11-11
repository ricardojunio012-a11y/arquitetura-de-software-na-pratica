// Conexão com o PostgreSQL e um esquema limpo para cada experimento.
import pg from "pg";

export async function conectar(url: string): Promise<pg.Client> {
  const banco = new pg.Client({ connectionString: url });
  await banco.connect();
  return banco;
}

export async function recriarEsquema(banco: pg.Client): Promise<void> {
  await banco.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
}
