// As versões "n1" e "corrigido": sobe a API, mede o perfil de um pedido e roda o
// teste de carga do dia 5 com o k6. O perfil (consultas por pedido e resposta) é
// determinístico e vai para saida/<versão>; os tempos dependem da máquina e vão para
// saida/tempos-<versão>.txt.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const [dados, versao] = process.argv.slice(2);
const BASE = "http://localhost:3000";

const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
await banco.connect();
await banco.query(fs.readFileSync(path.join(dados, "sql", "dados.sql"), "utf8"));
await banco.end();

const api = spawn(
  "node",
  ["--disable-warning=ExperimentalWarning", "src/servidor.ts"],
  {
    env: { ...process.env, VERSAO: versao },
    stdio: "inherit",
  },
);
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${BASE}/saude`)).ok) break;
  } catch {
    if (i > 50) throw new Error("a API não subiu");
    await new Promise((r) => setTimeout(r, 100));
  }
}

// O perfil de um pedido: quantas consultas, e a resposta (que deve ser a mesma)
await fetch(`${BASE}/perfil`);
const corpo = await (await fetch(`${BASE}/condominios/7/inadimplentes`)).text();
const perfil = await (await fetch(`${BASE}/perfil`)).json();
const linhas = JSON.parse(corpo);
const devendo = linhas.filter((l: any) => l.em_aberto_centavos > 0).length;
const resumoDaResposta = createHash("sha256").update(corpo).digest("hex").slice(0, 12);

const saida = path.join(dados, "saida", versao);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(
  path.join(saida, "perfil.txt"),
  [
    `versão: ${versao}`,
    "rota: GET /condominios/7/inadimplentes",
    `consultas ao banco por pedido: ${perfil.consultas}`,
    `unidades na resposta: ${linhas.length}, ${devendo} com valor em aberto`,
    `resumo da resposta (sha256): ${resumoDaResposta}`,
    "",
  ].join("\n"),
);

// O teste de carga
const resumo = "/tmp/resumo-k6.json";
const k6 = spawnSync(
  "k6",
  [
    "run",
    "--quiet",
    "--summary-trend-stats=avg,med,p(95),p(99),max",
    `--summary-export=${resumo}`,
    "k6/dia5.js",
  ],
  { env: { ...process.env, BASE_URL: BASE }, stdio: "inherit" },
);
api.kill();

const m = JSON.parse(fs.readFileSync(resumo, "utf8")).metrics;
const d = m.http_req_duration;
const ms = (v: number) => `${v.toFixed(1)} ms`;
const tempos = [
  `versão: ${versao} (tempos medidos nesta máquina)`,
  `pedidos: ${m.http_reqs.count}, ${m.http_reqs.rate.toFixed(1)} por segundo`,
  `latência: média ${ms(d.avg)}, mediana ${ms(d.med)}, p95 ${ms(d["p(95)"])}, ` +
    `p99 ${ms(d["p(99)"])}, máxima ${ms(d.max)}`,
  `falhas: ${(m.http_req_failed.value * 100).toFixed(2)}%`,
  `limite p95 < 300 ms: ${k6.status === 0 ? "passou" : "falhou"}`,
  "",
];
fs.writeFileSync(path.join(dados, "saida", `tempos-${versao}.txt`), tempos.join("\n"));
console.log(tempos.join("\n"));
