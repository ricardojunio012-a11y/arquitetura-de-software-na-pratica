// Backup base, arquivamento do WAL e restauração numa instância à parte.
// É o que um serviço gerenciado faz por baixo da "restauração a um ponto no tempo".
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { esperar } from "./comum.ts";

const comoPostgres = (programa: string, args: string[], senha?: string) =>
  execFileSync("su-exec", ["postgres", programa, ...args], {
    env: { ...process.env, ...(senha ? { PGPASSWORD: senha } : {}) },
    stdio: "pipe",
  });

// Cópia física do banco inteiro, feita com o banco no ar
export function backupBase(destino: string): void {
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  execFileSync("chown", ["postgres:postgres", path.dirname(destino)]);
  const args = ["-h", "banco", "-U", "replicador", "-D", destino];
  comoPostgres("pg_basebackup", [...args, "-X", "stream", "-c", "fast"], "replicador");
}

// Fecha o segmento de WAL atual e espera ele chegar ao arquivo. Sem isso, as
// últimas transações ficam só no disco do servidor
export async function fecharSegmento(db: pg.Client): Promise<void> {
  const { rows } = await db.query("SELECT pg_walfile_name(pg_switch_wal()) AS s");
  for (let i = 0; i < 300; i++) {
    const r = await db.query("SELECT last_archived_wal AS a FROM pg_stat_archiver");
    if (r.rows[0].a !== null && r.rows[0].a >= rows[0].s) return;
    await esperar(100);
  }
  throw new Error(`o segmento ${rows[0].s} não chegou ao arquivo`);
}

export const RESTAURADO = {
  host: "localhost",
  port: 5433,
  user: "morada",
  password: "morada",
  database: "morada",
};

// Sobe uma instância nova a partir de uma cópia do backup base, aplica o WAL
// arquivado até o alvo (ou até o fim do arquivo) e a promove
export async function restaurar(base: string, destino: string, alvo?: string) {
  fs.rmSync(destino, { recursive: true, force: true });
  execFileSync("cp", ["-a", base, destino]); // nunca restaure sobre a única cópia
  const conf = [
    "port = 5433",
    "listen_addresses = 'localhost'",
    "unix_socket_directories = '/tmp'",
    "archive_mode = off",
    "restore_command = 'cp /arquivo/%f %p'",
  ];
  if (alvo) {
    conf.push(`recovery_target_time = '${alvo}'`);
    conf.push("recovery_target_inclusive = off");
    conf.push("recovery_target_action = 'promote'");
  }
  fs.appendFileSync(path.join(destino, "postgresql.auto.conf"), conf.join("\n") + "\n");
  fs.writeFileSync(path.join(destino, "recovery.signal"), "");
  execFileSync("chown", ["-R", "postgres:postgres", destino]);
  const log = path.join(destino, "restauracao.log");
  try {
    comoPostgres("pg_ctl", ["-D", destino, "-l", log, "-w", "-t", "120", "start"]);
  } catch (erro) {
    console.error(fs.readFileSync(log, "utf8"));
    throw erro;
  }
  // O servidor aceita conexões durante a recuperação; espera a promoção
  for (let i = 0; i < 600; i++) {
    const db = new pg.Client(RESTAURADO);
    await db.connect();
    const { rows } = await db.query("SELECT pg_is_in_recovery() AS r");
    if (!rows[0].r) return db;
    await db.end();
    await esperar(100);
  }
  throw new Error("a instância restaurada não saiu da recuperação");
}

export function pararRestaurado(destino: string): void {
  comoPostgres("pg_ctl", ["-D", destino, "-m", "fast", "-w", "stop"]);
}

// Copia uma tabela da instância restaurada para a produção. pipefail: se o
// pg_dump falhar, o comando inteiro falha, em vez de o psql receber nada
export function copiarTabela(tabela: string, bancoUrl: string): void {
  const r = RESTAURADO;
  const origem = `-h ${r.host} -p ${r.port} -U ${r.user} -d ${r.database}`;
  const dump = `pg_dump ${origem} -t ${tabela} --no-owner --no-privileges`;
  const carga = `psql -q -v ON_ERROR_STOP=1 "${bancoUrl}"`;
  execSync(`set -o pipefail; ${dump} | ${carga}`, {
    env: { ...process.env, PGPASSWORD: r.password },
    stdio: "pipe",
  });
}
