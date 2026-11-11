// A versão "sharding": as cobranças de nove condomínios em três bancos, com o
// roteamento na aplicação. Consultas de um condomínio vão a um banco só; o relatório
// de todos vai aos três (espalhar e juntar). No fim, um shard lógico muda de banco.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { gerarId, lerId } from "./ids.ts";
import { Roteador } from "./roteador.ts";

const dados = process.argv[2];
const URL_BASE = process.env.SHARDS_URL!;
const FISICOS = ["shard0", "shard1", "shard2"];

// Prepara três bancos vazios
const admin = new pg.Client({ connectionString: URL_BASE + "morada" });
await admin.connect();
for (const nome of FISICOS) {
  await admin.query(`DROP DATABASE IF EXISTS ${nome}`);
  await admin.query(`CREATE DATABASE ${nome}`);
}
await admin.end();
const bancos = new Map<string, pg.Client>();
for (const nome of FISICOS) {
  const banco = new pg.Client({ connectionString: URL_BASE + nome });
  await banco.connect();
  await banco.query(
    "CREATE TABLE cobrancas (id bigint PRIMARY KEY, condominio_id integer, " +
      "valor_centavos integer, situacao text)",
  );
  bancos.set(nome, banco);
}

// 12 shards lógicos em 3 bancos: 0 a 3 no shard0, 4 a 7 no shard1, 8 a 11 no shard2
const mapa: Record<number, string> = {};
for (let l = 0; l < 12; l++) mapa[l] = FISICOS[Math.floor(l / 4)];
const roteador = new Roteador(mapa);
const banco = (condominio: number) => bancos.get(roteador.fisico(condominio))!;

// Três cobranças por condomínio, a uma "hora" fixa, para os IDs serem sempre os mesmos
const agora = Date.UTC(2026, 9, 25, 12, 0, 0);
let sequencia = 0;
for (let c = 1; c <= 9; c++) {
  for (let i = 0; i < 3; i++) {
    const id = gerarId(agora, roteador.shardLogico(c), sequencia++);
    await banco(c).query("INSERT INTO cobrancas VALUES ($1, $2, $3, $4)", [
      id.toString(),
      c,
      40000 + c * 1000,
      i === 0 ? "aberta" : "paga",
    ]);
  }
}

const linhas: string[] = ["27 cobranças de 9 condomínios em 3 bancos"];
for (const nome of FISICOS) {
  const { rows } = await bancos
    .get(nome)!
    .query(
      "SELECT string_agg(DISTINCT condominio_id::text, ', ') AS c, count(*) AS n " +
        "FROM cobrancas",
    );
  linhas.push(`  ${nome}: ${rows[0].n} cobranças, condomínios ${rows[0].c}`);
}

const doSete = await banco(7).query(
  "SELECT count(*) AS n FROM cobrancas WHERE condominio_id = 7",
);
linhas.push(
  `cobranças do condomínio 7: ${doSete.rows[0].n}, ` +
    `consultando só o ${roteador.fisico(7)}`,
);

// Sem o condomínio, a consulta precisa ir a todos os bancos e juntar as respostas
const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
let emAberto = 0;
for (const nome of roteador.todos()) {
  const { rows } = await bancos
    .get(nome)!
    .query(
      "SELECT coalesce(sum(valor_centavos), 0) AS t FROM cobrancas " +
        "WHERE situacao = 'aberta'",
    );
  emAberto += Number(rows[0].t);
}
linhas.push(
  `em aberto em todos os condomínios: R$ ${reais(emAberto)}, ` +
    `consultando ${roteador.todos().length} bancos`,
);

const { rows: umId } = await banco(7).query(
  "SELECT id FROM cobrancas WHERE condominio_id = 7 ORDER BY id LIMIT 1",
);
const lido = lerId(BigInt(umId[0].id));
linhas.push(
  `um ID do condomínio 7: ${umId[0].id}`,
  `  criado em ${lido.criadoEm}, shard lógico ${lido.shardLogico}, ` +
    `sequência ${lido.sequencia}`,
);

// Move o shard lógico do condomínio 7 para o shard2: copia, muda o mapa, apaga a origem
const logico = roteador.shardLogico(7);
const origem = bancos.get(roteador.fisico(7))!;
const destino = bancos.get("shard2")!;
const { rows: copiar } = await origem.query(
  "SELECT * FROM cobrancas WHERE condominio_id % 12 = $1",
  [logico],
);
for (const r of copiar) {
  await destino.query("INSERT INTO cobrancas VALUES ($1, $2, $3, $4)", [
    r.id,
    r.condominio_id,
    r.valor_centavos,
    r.situacao,
  ]);
}
roteador.mover(logico, "shard2");
await origem.query("DELETE FROM cobrancas WHERE condominio_id % 12 = $1", [logico]);
const depois = await banco(7).query(
  "SELECT count(*) AS n FROM cobrancas WHERE condominio_id = 7",
);
linhas.push(
  `shard lógico ${logico} movido para o shard2 (${copiar.length} cobranças copiadas)`,
  `cobranças do condomínio 7: ${depois.rows[0].n}, ` +
    `consultando só o ${roteador.fisico(7)}`,
);

await Promise.all([...bancos.values()].map((b) => b.end()));
const saida = path.join(dados, "saida", "sharding");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
