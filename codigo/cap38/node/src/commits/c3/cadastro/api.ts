// Cadastro: dono das unidades
import type { Banco } from "../../../banco.ts";

export type Unidade = { id: number; nome: string };

export function unidadesDo(banco: Banco, condominio: number): Promise<Unidade[]> {
  return banco.consultar<Unidade>(
    "select id, nome from cadastro.unidades where condominio = $1 order by id",
    [condominio],
  );
}
