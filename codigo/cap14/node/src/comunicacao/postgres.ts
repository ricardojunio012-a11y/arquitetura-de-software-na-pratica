// Repositório de avisos no PostgreSQL. A chave primária garante, no banco, que o
// mesmo aviso não é gravado duas vezes.
import pg from "pg";
import type { RepositorioDeAvisos } from "./dominio.ts";

export class AvisosNoPostgres implements RepositorioDeAvisos {
  readonly #banco: pg.Client;

  constructor(banco: pg.Client) {
    this.#banco = banco;
  }

  static async conectar(url: string) {
    const banco = new pg.Client({ connectionString: url });
    await banco.connect();
    await banco.query(`
      DROP TABLE IF EXISTS avisos;
      CREATE TABLE avisos (id text PRIMARY KEY, texto text NOT NULL)`);
    return { avisos: new AvisosNoPostgres(banco), fechar: () => banco.end() };
  }

  async jaEnviado(id: string) {
    const { rows } = await this.#banco.query("SELECT 1 FROM avisos WHERE id = $1", [
      id,
    ]);
    return rows.length > 0;
  }

  async registrar(id: string, texto: string) {
    await this.#banco.query("INSERT INTO avisos VALUES ($1, $2)", [id, texto]);
  }
}
