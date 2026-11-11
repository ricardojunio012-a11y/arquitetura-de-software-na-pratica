// O cofre de chaves: uma chave por titular, guardada cifrada pela chave mestra.
// Num sistema real, é um serviço de chaves (KMS) fora do banco da aplicação.
import type pg from "pg";
import { abrirEnvelope, envelopar, novaChave } from "./cripto.ts";

export class Cofre {
  private readonly db: pg.Client;
  private readonly mestra: Buffer;

  constructor(db: pg.Client, mestra: Buffer) {
    this.db = db;
    this.mestra = mestra;
  }

  async criar(titular: number): Promise<Buffer> {
    const chave = novaChave();
    await this.db.query(
      "INSERT INTO cofre.chaves (titular, chave_envelopada) VALUES ($1, $2)",
      [titular, envelopar(this.mestra, chave)],
    );
    return chave;
  }

  // Sem chave, devolve undefined: o dado do titular ficou ilegível.
  async chave(titular: number): Promise<Buffer | undefined> {
    const { rows } = await this.db.query(
      "SELECT chave_envelopada FROM cofre.chaves WHERE titular = $1",
      [titular],
    );
    return rows[0] && abrirEnvelope(this.mestra, rows[0].chave_envelopada);
  }

  // Crypto-shredding: apagar a chave torna ilegíveis todas as cópias do dado.
  async destruir(titular: number): Promise<void> {
    await this.db.query("DELETE FROM cofre.chaves WHERE titular = $1", [titular]);
  }
}
