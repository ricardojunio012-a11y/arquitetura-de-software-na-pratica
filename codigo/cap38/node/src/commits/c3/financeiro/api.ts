// Financeiro: dono das cobranças e da regra de inadimplência
import type { Banco } from "../../../banco.ts";

export const HOJE = "2026-10-06";

export async function unidadeEmDia(banco: Banco, unidade: number): Promise<boolean> {
  const [linha] = await banco.consultar<{ atrasadas: number }>(
    `select count(*)::int as atrasadas from financeiro.cobrancas
      where unidade = $1 and not pago and vencimento < $2
        and not em_acordo`,
    [unidade, HOJE],
  );
  return linha.atrasadas === 0;
}
