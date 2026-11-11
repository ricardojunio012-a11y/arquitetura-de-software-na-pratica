// Reservas pergunta ao Financeiro, pela API, se a unidade está em dia
import type { Banco } from "../../../banco.ts";
import { unidadeEmDia } from "../financeiro/api.ts";

export async function podeReservar(banco: Banco, unidade: number): Promise<boolean> {
  return unidadeEmDia(banco, unidade);
}
