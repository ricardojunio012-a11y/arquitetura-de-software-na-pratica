// Commit c2: Reservas confere o débito direto na tabela de cobranças (um atalho)
import type { Banco } from "../../../banco.ts";

export async function podeReservar(banco: Banco, unidade: number): Promise<boolean> {
  const [linha] = await banco.consultar<{ atrasadas: number }>(
    `select count(*)::int as atrasadas from financeiro.cobrancas
      where unidade = $1 and not pago and vencimento < current_date`,
    [unidade],
  );
  return linha.atrasadas === 0;
}
