// A esteira de entrega do Morada. Cada commit do tronco passa pelos estágios em
// ordem; o primeiro que falha barra a publicação. Os estágios rodam as ferramentas
// de verdade (tsc, vitest, dependency-cruiser) sobre o código do commit.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { type Modulo, canario, trafego } from "./canario.ts";

const COMMITS = [
  { id: "c1", mensagem: "desconto de 3% para quem paga 5 dias antes" },
  { id: "c2", mensagem: "desconto truncado em vez de arredondado" },
  { id: "c3", mensagem: "vencimento em feriado vai para o dia útil (atalho)" },
  { id: "c4", mensagem: "vencimento em feriado vai para o dia útil (porta)" },
];

type Resultado = { ok: boolean; detalhe: string };
type Estagio = { nome: string; rodar(pasta: string): Promise<Resultado> };

const bin = (ferramenta: string) => `node_modules/.bin/${ferramenta}`;
const rodar = (ferramenta: string, args: string[]) =>
  spawnSync(bin(ferramenta), args, { encoding: "utf8" });

function arquivos(pasta: string): string[] {
  return readdirSync(pasta, { recursive: true, encoding: "utf8" })
    .filter((nome) => nome.endsWith(".ts"))
    .map((nome) => join(pasta, nome))
    .sort();
}

// --- os estágios -------------------------------------------------------------------

async function compilar(pasta: string): Promise<Resultado> {
  const opcoes = ["--noEmit", "--strict", "--target", "es2023", "--module", "nodenext"];
  const extras = ["--allowImportingTsExtensions", "--types", "node", "--skipLibCheck"];
  const r = rodar("tsc", [...opcoes, ...extras, ...arquivos(pasta)]);
  const erros = (r.stdout.match(/error TS/g) ?? []).length;
  return { ok: r.status === 0, detalhe: r.status === 0 ? "" : `${erros} erros` };
}

async function testar(pasta: string): Promise<Resultado> {
  const relatorio = `/tmp/vitest-${pasta.replaceAll("/", "-")}.json`;
  const args = ["--config", "vitest.esteira.ts", "--reporter=json"];
  rodar("vitest", ["run", pasta, ...args, `--outputFile=${relatorio}`]);
  const json = JSON.parse(readFileSync(relatorio, "utf8"));
  const falhas = json.testResults
    .flatMap((arquivo: any) => arquivo.assertionResults)
    .filter((t: any) => t.status === "failed")
    .map((t: any) => `"${t.title}"`);
  const contagem = `${json.numPassedTests} de ${json.numTotalTests}`;
  if (falhas.length === 0) return { ok: true, detalhe: contagem };
  return { ok: false, detalhe: `${contagem}; falhou: ${falhas.join(", ")}` };
}

// O teste de arquitetura: as regras ficam em .dependency-cruiser.cjs
async function verificarArquitetura(pasta: string): Promise<Resultado> {
  const args = [pasta, "--config", ".dependency-cruiser.cjs", "--output-type", "json"];
  const json = JSON.parse(rodar("depcruise", args).stdout);
  const violacoes = json.summary.violations.map(
    (v: any) =>
      `${v.rule.name}: ${relative(pasta, v.from)} -> ${relative(pasta, v.to)}`,
  );
  if (violacoes.length === 0) return { ok: true, detalhe: "0 violações" };
  return { ok: false, detalhe: violacoes.join("; ") };
}

// O artefato é identificado pelo conteúdo: o mesmo código gera o mesmo nome, e é
// esse artefato, e não uma nova compilação, que vai para o canário e a produção
async function empacotar(pasta: string): Promise<Resultado> {
  const hash = createHash("sha256");
  for (const arquivo of arquivos(pasta).filter((a) => !a.endsWith(".test.ts"))) {
    hash.update(relative(pasta, arquivo)).update(readFileSync(arquivo));
  }
  return { ok: true, detalhe: `morada-${hash.digest("hex").slice(0, 12)}` };
}

let producao = "c0";
const consultas = trafego(20_000, 2026);
const afetadas: string[] = [];

async function publicarNoCanario(pasta: string): Promise<Resultado> {
  const nova: Modulo = await import(`./commits/${pasta.split("/").pop()}/index.ts`);
  const atual: Modulo = await import(`./commits/${producao}/index.ts`);
  const r = await canario(nova, atual, consultas);
  const motivo = r.canario.mensagem ? ` (${r.canario.mensagem})` : "";
  const detalhe =
    `5%: ${r.canario.erros} erros em ${r.canario.pedidos}${motivo}; ` +
    `produção: ${r.producao.erros} em ${r.producao.pedidos}`;
  if (!r.aprovado) afetadas.push(`${r.canario.erros}`);
  return { ok: r.aprovado, detalhe };
}

const ESTAGIOS: Estagio[] = [
  { nome: "compilar", rodar: compilar },
  { nome: "testes", rodar: testar },
  { nome: "arquitetura", rodar: verificarArquitetura },
  { nome: "empacotar", rodar: empacotar },
  { nome: "canário", rodar: publicarNoCanario },
];

// --- a esteira -----------------------------------------------------------------------

const saida = join(process.argv[2] ?? "/dados", "saida", "esteira");
const linhas: string[] = [`em produção: c0`];
const publicacoes: string[] = [];
const falhas: string[] = [];

for (const commit of COMMITS) {
  linhas.push("", `commit ${commit.id}: ${commit.mensagem}`);
  let barrado = "";
  for (const estagio of ESTAGIOS) {
    const r = await estagio.rodar(`src/commits/${commit.id}`);
    const situacao = r.ok ? "ok" : "FALHOU";
    const linha = `  ${estagio.nome.padEnd(12)}${situacao.padEnd(8)}${r.detalhe}`;
    // detalhes longos vão para a linha de baixo, para caber na página
    if (linha.length <= 86) linhas.push(linha.trimEnd());
    else linhas.push(`  ${estagio.nome.padEnd(12)}${situacao}`, `      ${r.detalhe}`);
    if (!r.ok) {
      barrado = estagio.nome;
      break;
    }
  }
  if (barrado === "canário") {
    publicacoes.push(commit.id);
    falhas.push(commit.id);
    linhas.push(
      `  => revertido: o canário foi desligado; a produção continua no ${producao}`,
    );
  } else if (barrado) {
    linhas.push(`  => barrado no estágio ${barrado}; nada foi publicado`);
  } else {
    publicacoes.push(commit.id);
    producao = commit.id;
    linhas.push(`  => publicado: ${commit.id} atende 100% do tráfego`);
  }
}

const taxa = Math.round((100 * falhas.length) / publicacoes.length);
linhas.push(
  "",
  `resumo: ${COMMITS.length} commits, ${publicacoes.length} publicações ` +
    `(${publicacoes.join(" e ")}), ${COMMITS.length - publicacoes.length} barrados`,
  `taxa de falha de mudança: ${falhas.length} de ${publicacoes.length} (${taxa}%)`,
  `consultas afetadas pela falha: ${afetadas.join(", ") || "nenhuma"} ` +
    `de ${consultas.length}`,
  `em produção: ${producao}`,
);

mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
