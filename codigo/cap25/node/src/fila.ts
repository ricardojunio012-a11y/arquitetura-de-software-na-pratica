// A fila de tarefas sobre o PostgreSQL. Pegar uma tarefa é uma atualização atômica:
// SKIP LOCKED faz cada worker pular as linhas que outro já está pegando, e uma tarefa
// pega há mais tempo que o prazo de visibilidade volta para a fila.
import type pg from "pg";

export interface Tarefa {
  id: number;
  tipo: string;
  condominio_id: number;
  tentativas: number;
}

const PRAZO_DE_VISIBILIDADE = "2 seconds";

export async function pegar(banco: pg.Client): Promise<Tarefa | null> {
  const { rows } = await banco.query(
    `UPDATE tarefas SET estado = 'executando', pega_em = now(),
            tentativas = tentativas + 1
     WHERE id = (
       SELECT id FROM tarefas
       WHERE estado = 'pendente'
          OR (estado = 'executando' AND pega_em < now() - $1::interval)
       ORDER BY prioridade, id
       FOR UPDATE SKIP LOCKED
       LIMIT 1)
     RETURNING id, tipo, condominio_id, tentativas`,
    [PRAZO_DE_VISIBILIDADE],
  );
  return rows[0] ?? null;
}

// Gera os boletos e marca a tarefa como feita na mesma transação: ou as duas coisas
// acontecem, ou nenhuma, e uma repetição não duplica nada. O número da tentativa é o
// token de posse: se o prazo venceu e outro worker pegou a tarefa, a tentativa mudou,
// a marcação não acha a linha e a transação é desfeita. Devolve se concluiu.
export async function concluir(banco: pg.Client, tarefa: Tarefa, competencia: string) {
  await banco.query("BEGIN");
  try {
    const marcada = await banco.query(
      `UPDATE tarefas SET estado = 'feita', terminada_em = clock_timestamp()
       WHERE id = $1 AND estado = 'executando' AND tentativas = $2`,
      [tarefa.id, tarefa.tentativas],
    );
    if (marcada.rowCount === 0) {
      await banco.query("ROLLBACK");
      return false;
    }
    await banco.query(
      `INSERT INTO boletos
       SELECT id, generate_series(1, unidades), $2 FROM condominios WHERE id = $1
       ON CONFLICT DO NOTHING`,
      [tarefa.condominio_id, competencia],
    );
    await banco.query("COMMIT");
    return true;
  } catch (erro) {
    await banco.query("ROLLBACK");
    throw erro;
  }
}
