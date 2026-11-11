// As migrações do esquema. Cada uma limita a espera pela trava: se a tabela estiver
// ocupada, desiste em 2 segundos em vez de enfileirar todo o tráfego atrás dela
// (capítulo 16).
import type pg from "pg";

export async function migrar(banco: pg.Client, sql: string): Promise<void> {
  await banco.query("BEGIN");
  await banco.query("SET LOCAL lock_timeout = '2s'");
  await banco.query(sql);
  await banco.query("COMMIT");
}

// Copia os dados antigos para a coluna nova em lotes pequenos, cada lote na sua
// transação, para não travar a tabela inteira. A condição compara as duas colunas,
// e não só "telefone IS NULL": uma linha que a v2 gravou e a v1 alterou depois tem
// telefone preenchido, mas desatualizado.
export async function copiarEmLotes(banco: pg.Client, tamanho = 250) {
  let linhas = 0;
  let lotes = 0;
  for (;;) {
    const r = await banco.query(
      `UPDATE moradores SET telefone = celular
        WHERE id IN (SELECT id FROM moradores
                      WHERE telefone IS DISTINCT FROM celular
                      ORDER BY id LIMIT $1)`,
      [tamanho],
    );
    if (!r.rowCount) return { linhas, lotes };
    linhas += r.rowCount;
    lotes++;
  }
}
