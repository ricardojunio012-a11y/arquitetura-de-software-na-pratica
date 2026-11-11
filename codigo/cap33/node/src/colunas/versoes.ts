// As versões do código do cadastro de moradores durante a troca da coluna celular
// pela coluna telefone. Cada instância tem a sua própria conexão, como dois
// servidores da mesma aplicação em versões diferentes.
import pg from "pg";

type Sql = { ler: string; trocar: string; cadastrar: string };

const NAS_DUAS =
  "INSERT INTO moradores (nome, celular, telefone) VALUES ($1, $2, $2) RETURNING id";

const SQL: Record<string, Sql> = {
  // v1, a versão em produção: só conhece a coluna antiga
  v1: {
    ler: "SELECT celular AS tel FROM moradores WHERE id = $1",
    trocar: "UPDATE moradores SET celular = $2 WHERE id = $1",
    cadastrar: "INSERT INTO moradores (nome, celular) VALUES ($1, $2) RETURNING id",
  },
  // v2, expandir: grava nas duas colunas e continua lendo da antiga
  v2: {
    ler: "SELECT celular AS tel FROM moradores WHERE id = $1",
    trocar: "UPDATE moradores SET celular = $2, telefone = $2 WHERE id = $1",
    cadastrar: NAS_DUAS,
  },
  // v3, migrar: grava nas duas colunas e passa a ler da nova
  v3: {
    ler: "SELECT telefone AS tel FROM moradores WHERE id = $1",
    trocar: "UPDATE moradores SET celular = $2, telefone = $2 WHERE id = $1",
    cadastrar: NAS_DUAS,
  },
  // v4, contrair: só conhece a coluna nova
  v4: {
    ler: "SELECT telefone AS tel FROM moradores WHERE id = $1",
    trocar: "UPDATE moradores SET telefone = $2 WHERE id = $1",
    cadastrar: "INSERT INTO moradores (nome, telefone) VALUES ($1, $2) RETURNING id",
  },
};

export class Instancia {
  readonly versao: string;
  #banco: pg.Client;

  constructor(versao: string, banco: pg.Client) {
    this.versao = versao;
    this.#banco = banco;
  }

  static async iniciar(versao: string): Promise<Instancia> {
    const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
    await banco.connect();
    return new Instancia(versao, banco);
  }

  async ler(id: number): Promise<string | null> {
    const r = await this.#banco.query(SQL[this.versao].ler, [id]);
    return r.rows[0]?.tel ?? null;
  }

  async trocar(id: number, telefone: string): Promise<void> {
    await this.#banco.query(SQL[this.versao].trocar, [id, telefone]);
  }

  async cadastrar(nome: string, telefone: string): Promise<number> {
    const r = await this.#banco.query(SQL[this.versao].cadastrar, [nome, telefone]);
    return r.rows[0].id;
  }

  parar(): Promise<void> {
    return this.#banco.end();
  }
}
