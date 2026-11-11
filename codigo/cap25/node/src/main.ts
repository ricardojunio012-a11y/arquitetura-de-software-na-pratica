// As versões "fila" e "pressao". Em ambas, a geração mensal enfileira uma tarefa por
// condomínio, e 16 workers a consomem.
//  fila:    um worker morre com uma tarefa na mão; ela volta à fila e é refeita, sem
//           duplicar boletos. Outro worker fica lento com a tarefa 200 e tenta
//           concluí-la depois de ela ter sido refeita: o token de posse o barra.
//  pressao: no meio da geração chegam 50 pedidos de segunda via, mais urgentes; e o
//           banco emissor só aceita 8 chamadas simultâneas, primeiro sem e depois com
//           contrapressão do lado dos workers.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { BancoEmissor, Recusado, Semaforo } from "./emissor.ts";
import { concluir, pegar, type Tarefa } from "./fila.ts";

const [dados, versao] = process.argv.slice(2);
const COMPETENCIA = "2026-11";
const WORKERS = 16;
const conectar = async () => {
  const c = new pg.Client({ connectionString: process.env.BANCO_URL });
  await c.connect();
  return c;
};
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function preparar() {
  const banco = await conectar();
  await banco.query(fs.readFileSync(path.join(dados, "sql", "esquema.sql"), "utf8"));
  await banco.query(
    "INSERT INTO tarefas (tipo, condominio_id, prioridade) " +
      "SELECT 'mensal', id, 10 FROM condominios ORDER BY id",
  );
  return banco;
}

async function rodar(emissor: BancoEmissor, semaforo: Semaforo | null, morre: boolean) {
  const vigia = await conectar();
  let segundasVias = false;
  let lentoBarrado = false;
  const trabalhar = async () => {
    const banco = await conectar();
    for (;;) {
      const tarefa = await pegar(banco);
      if (!tarefa) {
        // A fila pode estar vazia só por um instante: confere se ainda há trabalho
        const { rows } = await banco.query(
          "SELECT count(*)::integer AS n FROM tarefas WHERE estado <> 'feita'",
        );
        if (rows[0].n === 0) break;
        await esperar(100);
        continue;
      }
      // Quem pega a tarefa 100 pela primeira vez morre com ela na mão, sem concluir
      // nem devolver
      if (morre && tarefa.id === 100 && tarefa.tentativas === 1) {
        await banco.end();
        return;
      }
      // Quem pega a tarefa 200 pela primeira vez trava (uma pausa longa, uma rede
      // lenta) até outro worker refazê-la, e só então tenta concluir
      if (morre && tarefa.id === 200 && tarefa.tentativas === 1) {
        await esperarFeita(banco, 200);
        lentoBarrado = !(await concluir(banco, tarefa, COMPETENCIA));
        continue;
      }
      await registrarComTentativas(emissor, semaforo);
      await concluir(banco, tarefa as Tarefa, COMPETENCIA);
    }
    await banco.end();
  };
  const workers = Array.from({ length: WORKERS }, () => trabalhar());
  // No meio da geração, chegam 50 pedidos de segunda via, com prioridade maior
  if (!morre) {
    for (;;) {
      const { rows } = await vigia.query(
        "SELECT count(*)::integer AS n FROM tarefas WHERE estado = 'feita'",
      );
      if (rows[0].n >= 1500) break;
      await esperar(20);
    }
    await vigia.query(
      "INSERT INTO tarefas (tipo, condominio_id, prioridade) " +
        "SELECT 'segunda-via', id, 1 FROM condominios WHERE id <= 50",
    );
    segundasVias = true;
  }
  await Promise.all(workers);
  await vigia.end();
  return { segundasVias, lentoBarrado };
}

async function esperarFeita(banco: pg.Client, id: number) {
  for (;;) {
    const { rows } = await banco.query("SELECT estado FROM tarefas WHERE id = $1", [
      id,
    ]);
    if (rows[0].estado === "feita") return;
    await esperar(100);
  }
}

async function registrarComTentativas(
  emissor: BancoEmissor,
  semaforo: Semaforo | null,
) {
  for (let tentativa = 0; ; tentativa++) {
    try {
      const chamar = () => emissor.registrar();
      return await (semaforo ? semaforo.usar(chamar) : chamar());
    } catch (erro) {
      if (!(erro instanceof Recusado)) throw erro;
      await esperar(10 * 2 ** Math.min(tentativa, 5));
    }
  }
}

async function resumo(banco: pg.Client) {
  const q = async (sql: string) => (await banco.query(sql)).rows[0];
  const t = await q(
    "SELECT count(*) FILTER (WHERE estado = 'feita')::integer AS feitas, " +
      "count(*) FILTER (WHERE tentativas > 1)::integer AS refeitas FROM tarefas",
  );
  const b = await q("SELECT count(*)::integer AS n FROM boletos");
  const esperado = await q("SELECT sum(unidades)::integer AS n FROM condominios");
  return { ...t, boletos: b.n, esperado: esperado.n };
}

const linhas: string[] = [];
if (versao === "fila") {
  const banco = await preparar();
  const { lentoBarrado } = await rodar(new BancoEmissor(1000), null, true);
  const r = await resumo(banco);
  linhas.push(
    `3000 condomínios enfileirados, ${WORKERS} workers`,
    "um worker morreu com a tarefa 100 na mão",
    "um worker lento tentou concluir a tarefa 200, já refeita: " +
      (lentoBarrado ? "barrado (token de posse)" : "conseguiu"),
    `tarefas feitas: ${r.feitas}; ` +
      `refeitas depois do prazo de visibilidade: ${r.refeitas}`,
    `boletos gerados: ${r.boletos} (esperados: ${r.esperado})`,
  );
  await banco.end();
} else {
  for (const comContrapressao of [false, true]) {
    const banco = await preparar();
    const emissor = new BancoEmissor(8);
    await rodar(emissor, comContrapressao ? new Semaforo(8) : null, false);
    const { rows } = await banco.query(
      `SELECT max(terminada_em) FILTER (WHERE tipo = 'segunda-via') <
              max(terminada_em) FILTER (WHERE tipo = 'mensal') AS antes
       FROM tarefas`,
    );
    const r = await resumo(banco);
    linhas.push(
      `== ${comContrapressao ? "com" : "sem"} contrapressão nos workers`,
      `tarefas feitas: ${r.feitas} (3000 mensais + 50 segundas vias)`,
      "as segundas vias terminaram antes do fim das mensais: " +
        (rows[0].antes ? "sim" : "não"),
      `recusas do banco emissor: ${emissor.recusas > 0 ? "houve" : "nenhuma"}`,
      "",
    );
    await banco.end();
  }
}

const saida = path.join(dados, "saida", versao);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
