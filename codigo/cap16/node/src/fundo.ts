// O fundo de reserva: o saldo é a soma dos movimentos, e uma saída só pode ser
// registrada se houver saldo.
import type pg from "pg";

export async function prepararFundo(banco: pg.Client): Promise<void> {
  await banco.query("TRUNCATE movimentos");
  await banco.query("INSERT INTO fundos VALUES (1, 1234) ON CONFLICT DO NOTHING");
  await banco.query(
    "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) " +
      "VALUES (1, 100000, 'saldo inicial')",
  );
}

export async function saldo(banco: pg.Client, fundo: number): Promise<number> {
  const { rows } = await banco.query(
    "SELECT coalesce(sum(valor_centavos), 0)::int AS saldo FROM movimentos " +
      "WHERE fundo_id = $1",
    [fundo],
  );
  return rows[0].saldo;
}

export async function inserirSaida(
  banco: pg.Client,
  fundo: number,
  valor: number,
  descricao: string,
): Promise<void> {
  await banco.query(
    "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) VALUES ($1, $2, $3)",
    [fundo, -valor, descricao],
  );
}

// A forma correta em READ COMMITTED: travar a linha do fundo antes de ler o saldo.
// Duas saídas do mesmo fundo passam a acontecer uma depois da outra.
export async function registrarSaida(
  banco: pg.Client,
  fundo: number,
  valor: number,
  descricao: string,
): Promise<boolean> {
  await banco.query("BEGIN");
  try {
    await banco.query("SELECT id FROM fundos WHERE id = $1 FOR UPDATE", [fundo]);
    if ((await saldo(banco, fundo)) < valor) {
      await banco.query("ROLLBACK");
      return false;
    }
    await inserirSaida(banco, fundo, valor, descricao);
    await banco.query("COMMIT");
    return true;
  } catch (erro) {
    await banco.query("ROLLBACK");
    throw erro;
  }
}

// 123456 centavos → "1.234,56"
export function reais(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(centavos);
  const inteiro = String(Math.floor(absoluto / 100)).replace(/\B(?=(\d{3})+$)/g, ".");
  return `${sinal}${inteiro},${String(absoluto % 100).padStart(2, "0")}`;
}
