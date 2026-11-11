// Os quatro serviços do onboarding e o de avisos. Cada função usa só o seu esquema e
// é idempotente: chamada duas vezes com a mesma saga, produz o mesmo efeito.
import type pg from "pg";

export interface Morador {
  nome: string;
  cpf: string;
  unidade: string;
}

export async function assinarContrato(db: pg.Client, saga: string, condominio: string) {
  await db.query(
    "INSERT INTO contratos.contratos (saga, condominio, estado) " +
      "VALUES ($1, $2, 'assinado') " +
      "ON CONFLICT (saga) DO NOTHING",
    [saga, condominio],
  );
}

// A compensação não apaga o contrato: registra o cancelamento e o motivo
export async function cancelarContrato(db: pg.Client, saga: string, motivo: string) {
  await db.query(
    "UPDATE contratos.contratos SET estado = 'cancelado', motivo = $2 WHERE saga = $1",
    [saga, motivo],
  );
}

export async function emitirCobranca(
  db: pg.Client,
  saga: string,
  condominio: string,
  valorCentavos: number,
) {
  await db.query(
    "INSERT INTO cobranca.lancamentos (chave, condominio, tipo, valor_centavos) " +
      "VALUES ($1, $2, 'cobranca', $3) ON CONFLICT (chave) DO NOTHING",
    [`${saga}:cobranca`, condominio, valorCentavos],
  );
}

// A compensação da cobrança é um estorno, um lançamento novo de mesmo valor
export async function estornarCobranca(db: pg.Client, saga: string) {
  await db.query(
    "INSERT INTO cobranca.lancamentos (chave, condominio, tipo, valor_centavos) " +
      "SELECT $2, condominio, 'estorno', valor_centavos FROM cobranca.lancamentos " +
      "WHERE chave = $1 ON CONFLICT (chave) DO NOTHING",
    [`${saga}:cobranca`, `${saga}:estorno`],
  );
}

export async function provisionarTenant(
  db: pg.Client,
  saga: string,
  condominio: string,
) {
  await db.query(
    "INSERT INTO plataforma.tenants (saga, condominio, estado) " +
      "VALUES ($1, $2, 'ativo') " +
      "ON CONFLICT (saga) DO NOTHING",
    [saga, condominio],
  );
}

export async function desativarTenant(db: pg.Client, saga: string) {
  await db.query(
    "UPDATE plataforma.tenants SET estado = 'desativado' WHERE saga = $1",
    [saga],
  );
}

// Dígitos verificadores do CPF
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "").split("").map(Number);
  if (d.length !== 11 || d.every((x) => x === d[0])) return false;
  for (const n of [9, 10]) {
    const soma = d.slice(0, n).reduce((s, x, i) => s + x * (n + 1 - i), 0);
    if (((soma * 10) % 11) % 10 !== d[n]) return false;
  }
  return true;
}

// A importação é tudo ou nada dentro do próprio serviço: uma transação local
export async function importarMoradores(
  db: pg.Client,
  saga: string,
  moradores: Morador[],
) {
  await db.query("BEGIN");
  try {
    await db.query("DELETE FROM cadastro.moradores WHERE saga = $1", [saga]);
    for (const [i, m] of moradores.entries()) {
      if (!cpfValido(m.cpf)) throw new Error(`linha ${i + 1}: CPF inválido (${m.cpf})`);
      await db.query(
        "INSERT INTO cadastro.moradores (saga, nome, cpf, unidade) " +
          "VALUES ($1, $2, $3, $4)",
        [saga, m.nome, m.cpf, m.unidade],
      );
    }
    await db.query("COMMIT");
  } catch (erro) {
    await db.query("ROLLBACK");
    throw erro;
  }
}

export async function removerMoradores(db: pg.Client, saga: string) {
  await db.query("DELETE FROM cadastro.moradores WHERE saga = $1", [saga]);
}

// O passo que não se desfaz: um e-mail enviado não volta
export async function enviarBoasVindas(
  db: pg.Client,
  saga: string,
  condominio: string,
) {
  await db.query(
    "INSERT INTO avisos.enviados (chave, condominio, destinatarios) " +
      "SELECT $1, $2, count(*) FROM cadastro.moradores WHERE saga = $1 " +
      "ON CONFLICT (chave) DO NOTHING",
    [saga, condominio],
  );
}
