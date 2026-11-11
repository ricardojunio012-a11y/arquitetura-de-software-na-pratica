// A rota mais lenta do painel do síndico: as unidades do condomínio com o valor em
// aberto de cada uma. Duas versões com o mesmo resultado.

export interface Consultor {
  query(sql: string, parametros?: unknown[]): Promise<{ rows: any[] }>;
}

export interface Linha {
  unidade: string;
  em_aberto_centavos: number;
}

// N+1: uma consulta para as unidades e mais uma para cada unidade. Com 120 unidades,
// são 121 idas e voltas ao banco, cada uma rápida, todas somadas
export async function inadimplenciaN1(banco: Consultor, condominio: number) {
  const { rows: unidades } = await banco.query(
    "SELECT id, codigo FROM unidades WHERE condominio_id = $1 ORDER BY codigo",
    [condominio],
  );
  const linhas: Linha[] = [];
  for (const u of unidades) {
    const { rows } = await banco.query(
      "SELECT coalesce(sum(valor_centavos), 0)::integer AS total FROM cobrancas " +
        "WHERE unidade_id = $1 AND situacao = 'aberta'",
      [u.id],
    );
    linhas.push({ unidade: u.codigo, em_aberto_centavos: rows[0].total });
  }
  return linhas;
}

// Corrigido: uma consulta só, que o banco resolve de uma vez
export async function inadimplenciaCorrigida(banco: Consultor, condominio: number) {
  const { rows } = await banco.query(
    `SELECT u.codigo AS unidade,
            coalesce(sum(c.valor_centavos)
                     FILTER (WHERE c.situacao = 'aberta'), 0)::integer
              AS em_aberto_centavos
     FROM unidades u LEFT JOIN cobrancas c ON c.unidade_id = u.id
     WHERE u.condominio_id = $1
     GROUP BY u.codigo ORDER BY u.codigo`,
    [condominio],
  );
  return rows as Linha[];
}
