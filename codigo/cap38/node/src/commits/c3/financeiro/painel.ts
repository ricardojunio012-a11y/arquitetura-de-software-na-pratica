// Commit c3: o painel passa a somar o débito unidade por unidade
import type { Banco } from "../../../banco.ts";
import { unidadesDo } from "../cadastro/api.ts";
import { HOJE } from "./api.ts";

export type Linha = { unidade: string; emAberto: number };

export async function painelInadimplencia(
  banco: Banco,
  condominio: number,
): Promise<Linha[]> {
  const linhas: Linha[] = [];
  for (const u of await unidadesDo(banco, condominio)) {
    const [d] = await banco.consultar<{ total: string | null }>(
      `select sum(valor) as total from financeiro.cobrancas
        where unidade = $1 and not pago and vencimento < $2`,
      [u.id, HOJE],
    );
    if (d.total !== null) linhas.push({ unidade: u.nome, emAberto: Number(d.total) });
  }
  return linhas;
}
