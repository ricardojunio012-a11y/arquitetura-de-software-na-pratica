// Um orquestrador de saga mínimo. Executa os passos em ordem e grava o progresso no
// banco depois de cada um; se um passo falha antes do pivô, executa as compensações
// dos passos concluídos, em ordem inversa. Depois do pivô, não há volta: os passos
// restantes são repetidos com espera crescente, até um limite; esgotado o limite, a
// saga para e espera uma pessoa. Ao retomar, o orquestrador continua do estado
// gravado: se caiu compensando, continua compensando.
import type pg from "pg";

export interface Passo {
  nome: string;
  executar: () => Promise<void>;
  compensar?: (motivo: string) => Promise<void>;
  pivo?: boolean; // o passo que não se desfaz
}

export interface Opcoes {
  tentativasDepoisDoPivo: number;
  esperaBaseMs: number;
}

// Usada no laboratório para simular a queda do orquestrador
export class Queda extends Error {}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// cairEm simula a queda: "cobranca" cai depois de executar esse passo;
// "compensacao:provisionamento", depois de compensá-lo; nos dois casos, antes de
// gravar o progresso
export async function executarSaga(
  db: pg.Client,
  id: string,
  passos: Passo[],
  cairEm?: string,
  opcoes: Opcoes = { tentativasDepoisDoPivo: 5, esperaBaseMs: 100 },
): Promise<string> {
  const registrar = (texto: string) =>
    db.query("INSERT INTO orquestrador.historico (saga, texto) VALUES ($1, $2)", [
      id,
      texto,
    ]);
  const mudarEstado = (estado: string, motivo?: string) =>
    db.query(
      "UPDATE orquestrador.sagas SET estado = $2, " +
        "motivo = coalesce($3, motivo) WHERE id = $1",
      [id, estado, motivo ?? null],
    );
  await db.query(
    "INSERT INTO orquestrador.sagas (id, estado) VALUES ($1, 'executando') " +
      "ON CONFLICT (id) DO NOTHING",
    [id],
  );
  const { rows } = await db.query("SELECT * FROM orquestrador.sagas WHERE id = $1", [
    id,
  ]);
  const gravado = rows[0];
  let concluidos: number = gravado.concluidos;

  // As compensações dos passos concluídos, em ordem inversa. São idempotentes:
  // depois de uma queda, refazer uma que já tinha sido feita não muda nada
  const compensar = async (motivo: string) => {
    await mudarEstado("compensando", motivo);
    for (let j = concluidos - 1; j >= 0; j--) {
      const desfazer = passos[j].compensar;
      if (!desfazer) continue;
      await desfazer(motivo);
      if (cairEm === `compensacao:${passos[j].nome}`)
        throw new Queda(`queda ao compensar ${passos[j].nome}`);
      await registrar(`compensado: ${passos[j].nome}`);
    }
    await mudarEstado("compensada");
    return "compensada";
  };

  // A retomada segue o estado gravado, e não só o número de passos concluídos
  if (gravado.estado === "concluida" || gravado.estado === "compensada")
    return gravado.estado;
  if (gravado.estado === "compensando") {
    await registrar("retomada durante a compensação");
    return compensar(gravado.motivo);
  }
  if (concluidos > 0) await registrar(`retomada depois de ${concluidos} passo(s)`);

  const pivo = passos.findIndex((p) => p.pivo);
  for (let i = concluidos; i < passos.length; i++) {
    const passo = passos[i];
    for (let tentativa = 1; ; tentativa++) {
      try {
        await passo.executar();
        if (passo.nome === cairEm) throw new Queda(`queda depois de ${passo.nome}`);
        break;
      } catch (erro) {
        if (erro instanceof Queda) throw erro; // o progresso não foi gravado
        const motivo = (erro as Error).message;
        if (pivo < 0 || i <= pivo) {
          await registrar(`${passo.nome} falhou: ${motivo}`);
          return compensar(motivo);
        }
        // Depois do pivô, não há volta: tenta de novo, esperando cada vez mais
        if (tentativa >= opcoes.tentativasDepoisDoPivo) {
          await registrar(`${passo.nome} esgotou as tentativas; saga parada`);
          await mudarEstado("parada", motivo);
          return "parada";
        }
        await registrar(`${passo.nome} falhou depois do pivô; tentando de novo`);
        await esperar(opcoes.esperaBaseMs * 2 ** (tentativa - 1));
      }
    }
    concluidos = i + 1;
    await db.query("UPDATE orquestrador.sagas SET concluidos = $2 WHERE id = $1", [
      id,
      concluidos,
    ]);
    await registrar(`concluído: ${passo.nome}`);
  }
  await mudarEstado("concluida");
  return "concluida";
}
