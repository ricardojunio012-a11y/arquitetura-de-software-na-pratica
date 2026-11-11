// O relatório de inadimplentes do síndico, com o defeito que o capítulo usa para
// mostrar o vazamento: a consulta esqueceu o filtro de condomínio.
import type pg from "pg";

export interface Inadimplente {
  condominio_id: number;
  unidade: string;
  morador: string;
  valor_centavos: number;
}

export async function inadimplentes(banco: pg.Client): Promise<Inadimplente[]> {
  const { rows } = await banco.query(
    `SELECT condominio_id, unidade, morador, valor_centavos
     FROM cobrancas
     WHERE situacao = 'aberta' -- falta: AND condominio_id = $1
     ORDER BY condominio_id, unidade`,
  );
  return rows;
}
