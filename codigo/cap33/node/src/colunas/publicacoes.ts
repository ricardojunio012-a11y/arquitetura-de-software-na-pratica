// Renomear a coluna celular para telefone com a aplicação no ar. Durante cada
// publicação, a versão antiga e a nova atendem juntas, contra o mesmo PostgreSQL.
//   renomear: a migração e o código novo saem na mesma publicação
//   expandir: três publicações (expandir, migrar, contrair)
//   atalho:   as três publicações, mas copiando os dados antes de a v1 sair
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { gerador } from "../aleatorio.ts";
import { copiarEmLotes, migrar } from "./migracoes.ts";
import { Instancia } from "./versoes.ts";

const cenario = process.argv[3];
const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
await banco.connect();
const linhas: string[] = [];
const esperado = new Map<number, string>(); // o último telefone gravado com sucesso
const sorteio = gerador(16);
let totalErros = 0;
let totalErradas = 0;

const telefone = () => `(11) 9${String(Math.floor(sorteio() * 1e8)).padStart(8, "0")}`;

async function recriarTabela() {
  await banco.query("DROP TABLE IF EXISTS moradores");
  await banco.query(`CREATE TABLE moradores (
    id serial PRIMARY KEY, nome text NOT NULL, celular text)`);
  esperado.clear();
  for (let i = 1; i <= 1_000; i++) {
    const tel = telefone();
    await banco.query("INSERT INTO moradores (nome, celular) VALUES ($1, $2)", [
      `Morador ${i}`,
      tel,
    ]);
    esperado.set(i, tel);
  }
}

// 200 operações, distribuídas em rodízio entre as instâncias que estão no ar:
// 60% leituras, 30% trocas de telefone e 10% cadastros
async function trafego(rotulo: string, versoes: string[]) {
  const instancias = await Promise.all(versoes.map((v) => Instancia.iniciar(v)));
  let erros = 0;
  let erradas = 0;
  let primeiroErro = "";
  for (let i = 0; i < 200; i++) {
    const instancia = instancias[i % instancias.length];
    const operacao = sorteio();
    const ids = [...esperado.keys()];
    const id = ids[Math.floor(sorteio() * ids.length)];
    const tel = telefone();
    try {
      if (operacao < 0.6) {
        if ((await instancia.ler(id)) !== esperado.get(id)) erradas++;
      } else if (operacao < 0.9) {
        await instancia.trocar(id, tel);
        esperado.set(id, tel);
      } else {
        esperado.set(await instancia.cadastrar(`Morador novo ${i}`, tel), tel);
      }
    } catch (erro) {
      erros++;
      primeiroErro ||= (erro as Error).message;
    }
  }
  await Promise.all(instancias.map((i) => i.parar()));
  totalErros += erros;
  totalErradas += erradas;
  const contagem = `${erros} erros, ${erradas} leituras erradas`;
  linhas.push(`  ${rotulo.padEnd(36)}200 operações: ${contagem}`);
  if (primeiroErro) linhas.push(`    erro: ${primeiroErro}`);
}

async function migracao(sql: string) {
  await migrar(banco, sql);
  linhas.push(`  migração: ${sql}`);
}

async function copia() {
  const r = await copiarEmLotes(banco);
  linhas.push(`  cópia em lotes de 250: ${r.linhas} linhas em ${r.lotes} lotes`);
}

const ADICIONAR = "ALTER TABLE moradores ADD COLUMN telefone text";
const REMOVER = "ALTER TABLE moradores DROP COLUMN celular";

if (cenario === "renomear") {
  linhas.push("renomear de uma vez: a migração e o código novo na mesma publicação");
  await recriarTabela();
  await trafego("só a v1 (coluna celular)", ["v1"]);
  await migracao("ALTER TABLE moradores RENAME COLUMN celular TO telefone");
  await trafego("v1 e v4 juntas, durante a troca", ["v1", "v4"]);
  await trafego("só a v4 (coluna telefone)", ["v4"]);
  linhas.push("", "na outra ordem: o código novo sai antes da migração");
  await recriarTabela();
  await trafego("v1 e v4 juntas, antes da migração", ["v1", "v4"]);
} else if (cenario === "expandir") {
  await recriarTabela();
  linhas.push("publicação 1, expandir: a v2 grava nas duas colunas e lê da antiga");
  await migracao(ADICIONAR);
  await trafego("v1 e v2 juntas", ["v1", "v2"]);
  await trafego("só a v2", ["v2"]);
  linhas.push("", "migrar os dados antigos, com a v1 já fora do ar");
  await copia();
  linhas.push("", "publicação 2: a v3 passa a ler da coluna nova");
  await trafego("v2 e v3 juntas", ["v2", "v3"]);
  await trafego("só a v3", ["v3"]);
  linhas.push("", "publicação 3, contrair: a v4 só conhece a coluna nova");
  await trafego("v3 e v4 juntas", ["v3", "v4"]);
  await trafego("só a v4", ["v4"]);
  await migracao(REMOVER);
  await trafego("só a v4, sem a coluna antiga", ["v4"]);
} else if (cenario === "atalho") {
  await recriarTabela();
  linhas.push(
    "o atalho: copiar os dados logo depois de criar a coluna, com a v1 no ar",
  );
  await migracao(ADICIONAR);
  await copia();
  await trafego("v1 e v2 juntas", ["v1", "v2"]);
  await trafego("só a v2", ["v2"]);
  await trafego("v2 e v3 juntas", ["v2", "v3"]);
  await trafego("só a v3", ["v3"]);
} else {
  throw new Error("cenário desconhecido: use renomear, expandir ou atalho");
}

linhas.push("", `total: ${totalErros} erros e ${totalErradas} leituras erradas`);
if (cenario !== "renomear") {
  const r = await banco.query(`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE telefone IS NULL)::int AS sem FROM moradores`);
  linhas.push(
    `conferência: ${r.rows[0].total} moradores, ${r.rows[0].sem} sem telefone`,
  );
}
if (cenario === "atalho") {
  const r = await banco.query(`SELECT count(*)::int AS n FROM moradores
    WHERE telefone IS DISTINCT FROM celular`);
  linhas.push(`moradores com telefone diferente do celular: ${r.rows[0].n}`);
}
await banco.end();

const saida = join(process.argv[2] ?? "/dados", "saida", cenario);
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
