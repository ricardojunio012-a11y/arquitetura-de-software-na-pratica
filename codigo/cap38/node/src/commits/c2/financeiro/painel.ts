// Commit c1: o painel de inadimplência com uma consulta agregada
import type { Banco } from "../../../banco.ts";
import { unidadesDo } from "../cadastro/api.ts";
import { HOJE } from "./api.ts";

export type Linha = { unidade: string; emAberto: number };

export async function painelInadimplencia(
  banco: Banco,
  condominio: number,
): Promise<Linha[]> {
  const unidades = await unidadesDo(banco, condominio);
  const debitos = await banco.consultar<{ unidade: number; total: string }>(
    `select unidade, sum(valor) as total from financeiro.cobrancas
      where condominio = $1 and not pago and vencimento < $2
      group by unidade`,
    [condominio, HOJE],
  );
  const total = new Map(debitos.map((d) => [d.unidade, Number(d.total)]));
  return unidades
    .filter((u) => total.has(u.id))
    .map((u) => ({ unidade: u.nome, emAberto: total.get(u.id)! }));
}
