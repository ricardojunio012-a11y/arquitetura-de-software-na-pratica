// O onboarding do Residencial Jardins: contrato, primeira cobrança, provisionamento do
// tenant, importação dos moradores e, por fim, o e-mail de boas-vindas.
//   ingenuo  chama os serviços em sequência; a importação falha e nada é desfeito
//   saga     a mesma falha, com um orquestrador que compensa os passos concluídos
//   retomada a planilha corrigida; o orquestrador cai no meio e outro retoma
//   compensacao  a planilha com erro; o orquestrador cai no meio da compensação, e
//            outro retoma compensando, sem avançar de novo
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { executarSaga, type Passo, Queda } from "./saga.ts";
import * as s from "./servicos.ts";

const [versao, dados] = process.argv.slice(2);
const conectar = async () => {
  const c = new pg.Client({ connectionString: process.env.BANCO_URL });
  await c.connect();
  return c;
};

// 40 moradores com CPFs válidos; na planilha original, a linha 37 tem um erro de
// digitação no último dígito
function cpf(base: number): string {
  const d = String(base).padStart(9, "0").split("").map(Number);
  for (const n of [9, 10]) {
    const soma = d.slice(0, n).reduce((t, x, i) => t + x * (n + 1 - i), 0);
    d.push(((soma * 10) % 11) % 10);
  }
  const t = d.join("");
  return `${t.slice(0, 3)}.${t.slice(3, 6)}.${t.slice(6, 9)}-${t.slice(9)}`;
}
const planilha = (comErro: boolean): s.Morador[] =>
  Array.from({ length: 40 }, (_, i) => {
    let documento = cpf(123456000 + i * 7919);
    if (comErro && i === 36)
      documento = documento.slice(0, -1) + ((+documento.at(-1)! + 1) % 10);
    return { nome: `Morador ${i + 1}`, cpf: documento, unidade: `${101 + i}` };
  });

const condominio = "Residencial Jardins";
const saga = "onboarding-jardins";
let chamadasDeCobranca = 0;
const passos = (db: pg.Client, moradores: s.Morador[]): Passo[] => [
  {
    nome: "contrato",
    executar: () => s.assinarContrato(db, saga, condominio),
    compensar: (motivo) => s.cancelarContrato(db, saga, motivo),
  },
  {
    nome: "cobranca",
    executar: () => {
      chamadasDeCobranca++;
      return s.emitirCobranca(db, saga, condominio, 89000);
    },
    compensar: () => s.estornarCobranca(db, saga),
  },
  {
    nome: "provisionamento",
    executar: () => s.provisionarTenant(db, saga, condominio),
    compensar: () => s.desativarTenant(db, saga),
  },
  {
    nome: "importacao",
    executar: () => s.importarMoradores(db, saga, moradores),
    compensar: () => s.removerMoradores(db, saga),
  },
  {
    nome: "boas-vindas",
    executar: () => s.enviarBoasVindas(db, saga, condominio),
    pivo: true,
  },
];

async function estado(db: pg.Client): Promise<string[]> {
  const um = async (sql: string) => (await db.query(sql, [saga])).rows[0];
  const contrato = await um("SELECT estado FROM contratos.contratos WHERE saga = $1");
  const { rows: lanc } = await db.query(
    "SELECT tipo, valor_centavos FROM cobranca.lancamentos " +
      "WHERE chave LIKE $1 || ':%' ORDER BY id",
    [saga],
  );
  const tenant = await um("SELECT estado FROM plataforma.tenants WHERE saga = $1");
  const moradores = await um(
    "SELECT count(*)::integer AS n FROM cadastro.moradores WHERE saga = $1",
  );
  const aviso = await um("SELECT destinatarios FROM avisos.enviados WHERE chave = $1");
  const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;
  const lancamentos = lanc.map((l) => `${l.tipo} ${reais(l.valor_centavos)}`);
  return [
    `  contrato:     ${contrato?.estado ?? "nenhum"}`,
    `  lançamentos:  ${lancamentos.join("; ") || "nenhum"}`,
    `  tenant:       ${tenant?.estado ?? "nenhum"}`,
    `  moradores:    ${moradores.n}`,
    `  boas-vindas:  ${aviso ? `enviado a ${aviso.destinatarios}` : "não enviado"}`,
  ];
}

const db = await conectar();
await db.query(fs.readFileSync(path.join(dados, "sql", "esquema.sql"), "utf8"));
const linhas: string[] = [];

if (versao === "ingenuo") {
  try {
    for (const passo of passos(db, planilha(true))) await passo.executar();
  } catch (erro) {
    linhas.push(`falhou: ${(erro as Error).message}`);
  }
} else if (versao === "saga") {
  linhas.push(`saga ${await executarSaga(db, saga, passos(db, planilha(true)))}`);
} else if (versao === "compensacao") {
  try {
    const queda = "compensacao:provisionamento";
    await executarSaga(db, saga, passos(db, planilha(true)), queda);
  } catch (erro) {
    if (!(erro instanceof Queda)) throw erro;
    linhas.push(
      "o orquestrador caiu durante a compensação, depois de desativar o tenant",
    );
  }
  // Quem retoma já vê a planilha corrigida, como se a falha tivesse sido passageira:
  // avançar agora concluiria a saga em cima de passos já desfeitos
  const outro = await conectar(); // um novo processo do orquestrador
  linhas.push(
    `saga ${await executarSaga(outro, saga, passos(outro, planilha(false)))}`,
  );
  await outro.end();
} else {
  try {
    await executarSaga(db, saga, passos(db, planilha(false)), "cobranca");
  } catch (erro) {
    if (!(erro instanceof Queda)) throw erro;
    linhas.push("o orquestrador caiu depois da cobrança, antes de gravar o progresso");
  }
  const outro = await conectar(); // um novo processo do orquestrador
  linhas.push(
    `saga ${await executarSaga(outro, saga, passos(outro, planilha(false)))}`,
  );
  linhas.push(`chamadas ao serviço de cobrança: ${chamadasDeCobranca}`);
  await outro.end();
}

const { rows: historico } = await db.query(
  "SELECT texto FROM orquestrador.historico ORDER BY id",
);
if (historico.length > 0) {
  linhas.push("histórico do orquestrador:", ...historico.map((h) => `  ${h.texto}`));
}
linhas.push("estado final nos serviços:", ...(await estado(db)));
await db.end();

const saida = path.join(dados, "saida", versao);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
