// Laboratório do capítulo 37.
//   ingenuo      o ex-morador é apagado só do cadastro; eventos e backup o guardam
//   esquecimento uma chave por titular; destruir a chave apaga todas as cópias
//   trilha       a trilha de auditoria encadeada por hash, atacada de quatro formas
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { Cofre } from "./cofre.ts";
import { EX_MORADOR, eventos, moradores } from "./dados.ts";
import * as t from "./titulares.ts";
import { type Ancora, encadear, type Registro, verificar } from "./trilha.ts";

const [versao, raiz] = process.argv.slice(2);
const saida = path.join(raiz, "saida", versao);
const backups = path.join(raiz, "saida", "backups");
const linhas: string[] = [];
const dizer = (s = "") => {
  linhas.push(s);
  console.log(s);
};
const conectar = async (url = process.env.BANCO_URL) => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
};

// Busca o nome, o CPF ou o e-mail do ex-morador, em claro, em cada tabela
async function procurarNoBanco(db: pg.Client): Promise<string[]> {
  const m = moradores[EX_MORADOR - 1];
  const tabelas = [
    "cadastro.moradores",
    "cadastro.cobrancas",
    "eventos.publicados",
    "auditoria.trilha",
  ];
  const achados = [];
  for (const tabela of tabelas) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM ${tabela} x WHERE x::text LIKE ANY ($1)`,
      [[m.nome, m.cpf, m.email].map((s) => `%${s}%`)],
    );
    achados.push(`   ${tabela.padEnd(22)}${rows[0].n}`);
  }
  return achados;
}

function procurarNoBackup(arquivo: string): number {
  const m = moradores[EX_MORADOR - 1];
  return fs
    .readFileSync(arquivo, "utf8")
    .split("\n")
    .filter((l) => [m.nome, m.cpf, m.email].some((s) => l.includes(s))).length;
}

// O backup noturno: pg_dump do banco de produção, sem o cofre de chaves
function backupNoturno(semCofre: boolean): string {
  fs.mkdirSync(backups, { recursive: true });
  const arquivo = path.join(backups, `${versao}.sql`);
  const fora = semCofre ? ["--exclude-schema=cofre"] : [];
  execFileSync("pg_dump", [
    "--no-owner",
    "--no-privileges",
    ...fora,
    "-f",
    arquivo,
    process.env.BANCO_URL!,
  ]);
  return arquivo;
}

// Restaura o backup num banco à parte, como se faria depois de um desastre
async function restaurar(db: pg.Client, arquivo: string): Promise<pg.Client> {
  await db.query("DROP DATABASE IF EXISTS restauracao");
  await db.query("CREATE DATABASE restauracao");
  const url = process.env.RESTAURACAO_URL!;
  execFileSync("psql", ["-q", "-v", "ON_ERROR_STOP=1", "-f", arquivo, url]);
  return conectar(url);
}

async function registrar(
  db: pg.Client,
  novo: Omit<Registro, "seq" | "anterior" | "hash">,
) {
  const { rows } = await db.query(
    "SELECT * FROM auditoria.trilha ORDER BY seq DESC LIMIT 1",
  );
  const r = encadear(rows[0], novo);
  await db.query("INSERT INTO auditoria.trilha VALUES ($1, $2, $3, $4, $5, $6, $7)", [
    r.seq,
    r.momento,
    r.ator,
    r.acao,
    r.alvo,
    r.anterior,
    r.hash,
  ]);
}

const lerTrilha = async (db: pg.Client): Promise<Registro[]> =>
  (await db.query("SELECT * FROM auditoria.trilha ORDER BY seq")).rows;

const resultado = (problemas: string[]) =>
  problemas.length ? problemas.join("; ") : "íntegra";

async function prepararBanco(db: pg.Client) {
  await db.query(fs.readFileSync(path.join(raiz, "sql", "esquema.sql"), "utf8"));
}

async function eliminacao(db: pg.Client, cifrar: boolean) {
  const mestra = Buffer.from(process.env.CHAVE_MESTRA ?? "", "hex");
  if (cifrar && mestra.length !== 32) throw new Error("CHAVE_MESTRA inválida");
  const cofre = cifrar ? new Cofre(db, mestra) : undefined;
  const m = moradores[EX_MORADOR - 1];

  for (const morador of moradores) await t.cadastrar(db, cofre, morador);
  const evs = eventos();
  for (const e of evs) await t.publicar(db, cofre, e);
  dizer(
    `1. Cadastro de ${moradores.length} moradores e ${evs.length} eventos publicados`,
  );
  const arquivo = backupNoturno(cifrar);
  dizer(`2. Backup noturno com pg_dump${cifrar ? ", sem o esquema do cofre" : ""}`);

  dizer(`3. ${m.nome} (titular ${m.titular}, unidade ${m.unidade}) se muda`);
  const copia = await t.exportar(db, cofre, m.titular);
  fs.writeFileSync(path.join(saida, "exportacao.json"), JSON.stringify(copia, null, 2));
  dizer(
    `   pede a cópia dos dados (art. 18, II): 1 cadastro, ` +
      `${copia.cobrancas.length} cobrança, ${copia.eventos.length} eventos`,
  );
  const ator = { momento: "2026-10-20T11:00", ator: "atendimento.lgpd" };
  await registrar(db, { ...ator, acao: "exportou", alvo: `titular:${m.titular}` });
  if (cofre) await t.esquecer(db, cofre, m.titular);
  else await t.apagarDoCadastro(db, m.titular);
  await registrar(db, { ...ator, acao: "eliminou", alvo: `titular:${m.titular}` });
  dizer(
    `   e a eliminação: ${cofre ? "cadastro apagado e chave destruída" : "DELETE"}`,
  );

  dizer("4. Onde o nome, o CPF ou o e-mail dele ainda aparecem em claro");
  for (const linha of await procurarNoBanco(db)) dizer(linha);
  dizer(`   ${"backup noturno".padEnd(22)}${procurarNoBackup(arquivo)} linhas`);

  dizer("5. Tentar ler o que sobrou");
  const { rows } = await db.query(
    "SELECT titular, dados FROM eventos.publicados ORDER BY seq",
  );
  const legiveis = async (lista: typeof rows) => {
    let n = 0;
    for (const r of lista) if (await t.revelar(cofre, r.titular, r.dados)) n++;
    return n;
  };
  const dele = rows.filter((r) => r.titular === m.titular);
  const outros = rows.filter((r) => r.titular !== m.titular);
  dizer(`   eventos dele: ${dele.length} publicados, ${await legiveis(dele)} legíveis`);
  dizer(
    `   eventos dos outros: ${outros.length} publicados, ` +
      `${await legiveis(outros)} legíveis`,
  );
  const restaurado = await restaurar(db, arquivo);
  const { rows: cad } = await restaurado.query(
    "SELECT titular, nome, cpf, email FROM cadastro.moradores ORDER BY titular",
  );
  await restaurado.end();
  const nomes = [];
  for (const r of cad) {
    const claro = await t.revelar(cofre, r.titular, {
      nome: r.nome,
      cpf: r.cpf,
      email: r.email,
    });
    nomes.push(claro ? claro.nome : `titular ${r.titular} ilegível`);
  }
  dizer(`   backup restaurado: ${nomes.join(", ")}`);
  const { rows: cob } = await db.query(
    "SELECT unidade, valor_centavos FROM cadastro.cobrancas WHERE titular = $1",
    [m.titular],
  );
  dizer(`6. Cobranças dele mantidas (obrigação legal): ${cob.length}`);
  const trilha = await lerTrilha(db);
  const integra = resultado(verificar(trilha));
  dizer(`7. Trilha de auditoria: ${trilha.length} registros, ${integra}`);
}

// A trilha usada no ataque: oito registros de um dia de operação
const dia: Omit<Registro, "seq" | "anterior" | "hash">[] = [
  {
    momento: "2026-10-20T09:00",
    ator: "sindica.ana",
    acao: "consultou",
    alvo: "titular:3",
  },
  {
    momento: "2026-10-20T09:05",
    ator: "portaria.joao",
    acao: "registrou",
    alvo: "unidade:302",
  },
  {
    momento: "2026-10-20T10:12",
    ator: "suporte.bruno",
    acao: "exportou",
    alvo: "condominio:12",
  },
  {
    momento: "2026-10-20T11:00",
    ator: "atendimento.lgpd",
    acao: "recebeu",
    alvo: "pedido:88",
  },
  {
    momento: "2026-10-20T11:30",
    ator: "atendimento.lgpd",
    acao: "exportou",
    alvo: "titular:3",
  },
  {
    momento: "2026-10-20T11:31",
    ator: "atendimento.lgpd",
    acao: "eliminou",
    alvo: "titular:3",
  },
  {
    momento: "2026-10-20T14:00",
    ator: "sindica.ana",
    acao: "consultou",
    alvo: "titular:1",
  },
  {
    momento: "2026-10-20T23:00",
    ator: "sistema",
    acao: "copiou",
    alvo: "backup:noturno",
  },
];

async function trilha(dono: pg.Client) {
  const app = await conectar(process.env.APP_URL);
  const recomecar = async () => {
    await dono.query("SET session_replication_role = replica");
    await dono.query("DELETE FROM auditoria.trilha");
    await dono.query("RESET session_replication_role");
    for (const r of dia) await registrar(app, r);
  };
  await recomecar();
  const registros = await lerTrilha(app);
  dizer("1. Oito registros gravados pela aplicação");
  for (const r of registros)
    dizer(
      `   ${r.seq} ${r.momento} ${r.ator} ${r.acao} ${r.alvo} ${r.hash.slice(0, 12)}`,
    );
  // A âncora: o hash do último registro, publicado fora do banco
  const ancora: Ancora = { seq: 8, hash: registros[7].hash };
  fs.writeFileSync(path.join(saida, "ancora.json"), JSON.stringify(ancora, null, 2));
  dizer(`   âncora publicada fora do banco: registro 8, ${ancora.hash.slice(0, 12)}`);
  dizer(`   verificação: ${resultado(verificar(registros, ancora))}`);

  const tentar = async (db: pg.Client, sql: string) => {
    try {
      await db.query(sql);
      return "aceito";
    } catch (e) {
      return `recusado (${(e as { code: string }).code}, ${(e as Error).message})`;
    }
  };
  const disfarce = "UPDATE auditoria.trilha SET ator = 'sistema' WHERE seq = 3";
  dizer("2. A aplicação tenta mudar o autor do registro 3");
  dizer(`   ${await tentar(app, disfarce)}`);
  dizer("3. O dono do banco tenta o mesmo");
  dizer(`   ${await tentar(dono, disfarce)}`);

  const semGatilhos = async (sql: string) => {
    await dono.query("SET session_replication_role = replica");
    await dono.query(sql);
    await dono.query("RESET session_replication_role");
  };
  dizer("4. O dono desliga os gatilhos e muda o autor do registro 3");
  await semGatilhos(disfarce);
  dizer(`   verificação: ${resultado(verificar(await lerTrilha(app)))}`);

  dizer("5. Ele muda o registro 3 e recalcula os hashes do 3 ao 8");
  await recomecar();
  const reescrita: Registro[] = [];
  for (const r of await lerTrilha(app)) {
    const original = r.seq === 3 ? { ...r, ator: "sistema" } : r;
    const novo = r.seq < 3 ? r : encadear(reescrita.at(-1), original);
    reescrita.push(novo);
  }
  for (const r of reescrita.slice(2))
    await semGatilhos(
      `UPDATE auditoria.trilha SET ator = '${r.ator}', anterior = '${r.anterior}', ` +
        `hash = '${r.hash}' WHERE seq = ${r.seq}`,
    );
  const reescrito = await lerTrilha(app);
  dizer(`   verificação sem a âncora: ${resultado(verificar(reescrito))}`);
  dizer(`   verificação com a âncora: ${resultado(verificar(reescrito, ancora))}`);

  dizer("6. Ele apaga o registro 5");
  await recomecar();
  await semGatilhos("DELETE FROM auditoria.trilha WHERE seq = 5");
  dizer(`   verificação: ${resultado(verificar(await lerTrilha(app), ancora))}`);

  dizer("7. Ele apaga os registros 7 e 8, o fim da trilha");
  await recomecar();
  await semGatilhos("DELETE FROM auditoria.trilha WHERE seq >= 7");
  const cortada = await lerTrilha(app);
  dizer(`   verificação sem a âncora: ${resultado(verificar(cortada))}`);
  dizer(`   verificação com a âncora: ${resultado(verificar(cortada, ancora))}`);
  await app.end();
}

const titulos: Record<string, string> = {
  ingenuo: "o ex-morador apagado só do cadastro",
  esquecimento: "crypto-shredding, uma chave por titular",
  trilha: "a trilha de auditoria encadeada por hash",
};
if (!titulos[versao]) throw new Error(`versão desconhecida: ${versao}`);
fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });
dizer(`Capítulo 37, versão ${versao}: ${titulos[versao]}`);
dizer();
const db = await conectar();
await prepararBanco(db);
if (versao === "trilha") await trilha(db);
else await eliminacao(db, versao === "esquecimento");
await db.end();
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
