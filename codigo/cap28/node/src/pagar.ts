// O pagamento com chave de idempotência: a chave enviada pelo aplicativo é gravada na
// mesma transação do pagamento. Um segundo pedido com a mesma chave esbarra na chave
// primária, espera o primeiro terminar e devolve o mesmo pagamento.
import type pg from "pg";

export async function pagar(
  banco: pg.Client,
  cobranca: string,
  valorCentavos: number,
  chave: string | null,
): Promise<number> {
  await banco.query("BEGIN");
  try {
    if (chave) {
      // Se outra transação já inseriu esta chave, o INSERT espera ela terminar
      const { rowCount } = await banco.query(
        "INSERT INTO idempotencia (chave) VALUES ($1) ON CONFLICT DO NOTHING",
        [chave],
      );
      if (rowCount === 0) {
        const { rows } = await banco.query(
          "SELECT pagamento_id FROM idempotencia WHERE chave = $1",
          [chave],
        );
        await banco.query("COMMIT");
        return rows[0].pagamento_id; // a mesma resposta do primeiro pedido
      }
    }
    const { rows } = await banco.query(
      "INSERT INTO pagamentos (cobranca, valor_centavos) VALUES ($1, $2) RETURNING id",
      [cobranca, valorCentavos],
    );
    if (chave) {
      await banco.query("UPDATE idempotencia SET pagamento_id = $1 WHERE chave = $2", [
        rows[0].id,
        chave,
      ]);
    }
    await banco.query("COMMIT");
    return rows[0].id;
  } catch (erro) {
    await banco.query("ROLLBACK");
    throw erro;
  }
}
