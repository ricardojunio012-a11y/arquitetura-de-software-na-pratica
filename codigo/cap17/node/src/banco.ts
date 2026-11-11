// Conexão com o PostgreSQL e transações em nome de um condomínio ou de uma
// administradora.
import pg from "pg";

export async function conectar(url: string): Promise<pg.Client> {
  const banco = new pg.Client({ connectionString: url });
  await banco.connect();
  return banco;
}

// Executa uma função numa transação em nome de quem pede. O "true" do set_config
// faz o valor valer só nesta transação: numa conexão reaproveitada de um pool, o
// condomínio do pedido anterior não sobra para o próximo.
async function emNomeDe<T>(
  banco: pg.Client,
  configuracao: string,
  valor: number | null,
  funcao: () => Promise<T>,
): Promise<T> {
  await banco.query("BEGIN");
  try {
    if (valor !== null) {
      await banco.query("SELECT set_config($1, $2, true)", [
        configuracao,
        String(valor),
      ]);
    }
    const resultado = await funcao();
    await banco.query("COMMIT");
    return resultado;
  } catch (erro) {
    await banco.query("ROLLBACK");
    throw erro;
  }
}

// O síndico age em nome de um condomínio. A administradora age em nome de todos os
// que administra, que a política do banco busca na tabela administracoes.
export const comoCondominio = <T>(
  banco: pg.Client,
  condominio: number | null,
  funcao: () => Promise<T>,
) => emNomeDe(banco, "app.condominio", condominio, funcao);

export const comoAdministradora = <T>(
  banco: pg.Client,
  administradora: number,
  funcao: () => Promise<T>,
) => emNomeDe(banco, "app.administradora", administradora, funcao);
