// Provisiona a fila, o bucket e o banco de um ambiente do Morada com o OpenTofu,
// confere o resultado pelos SDKs, provoca uma deriva ("alguém mudou no console") e
// deixa o OpenTofu corrigi-la. No fim, destrói tudo.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DeleteBucketCommand,
  GetBucketVersioningCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueueTagsCommand,
  SQSClient,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import pg from "pg";

const NUVEM = process.env.NUVEM_URL ?? "http://nuvem:4566";
const aws = {
  region: "us-east-1",
  endpoint: NUVEM,
  forcePathStyle: true,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};
const sqs = new SQSClient(aws);
const s3 = new S3Client(aws);
const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
await banco.connect();

const FILA = "morada-homologacao-cobrancas";
const MORTAS = "morada-homologacao-cobrancas-mortas";
const BUCKET = "morada-homologacao-prestacao-de-contas";
const linhas: string[] = [];

const env = {
  ...process.env,
  TF_VAR_nuvem_url: NUVEM,
  TF_VAR_banco_host: "banco",
  TF_IN_AUTOMATION: "1",
};

// Roda o OpenTofu; o código de saída 2 do "plan -detailed-exitcode" quer dizer
// "há mudanças", e não erro
function tofu(...args: string[]) {
  const r = spawnSync("tofu", ["-chdir=infra", ...args], { env, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`tofu ${args[0]}: ${r.stderr}`);
  return r;
}

// Lê o plano gravado e conta o que ele faria, com o detalhe de cada mudança
function lerPlano(): string {
  const plano = JSON.parse(tofu("show", "-json", "plano.bin").stdout);
  const conta = { create: 0, update: 0, delete: 0 };
  const detalhes: string[] = [];
  for (const rc of plano.resource_changes ?? []) {
    const { actions, before, after } = rc.change;
    for (const a of actions as (keyof typeof conta)[]) if (a in conta) conta[a]++;
    if (actions.includes("update")) {
      for (const campo of Object.keys(after ?? {})) {
        const [b, d] = [JSON.stringify(before[campo]), JSON.stringify(after[campo])];
        if (b !== d) detalhes.push(`     ${rc.address}.${campo}: ${b} -> ${d}`);
      }
    }
  }
  const resumo =
    `${conta.create} a criar, ${conta.update} a mudar, ` + `${conta.delete} a destruir`;
  return [resumo, ...detalhes].join("\n");
}

async function urlDaFila(nome: string) {
  return (await sqs.send(new GetQueueUrlCommand({ QueueName: nome }))).QueueUrl!;
}

async function visibilidade() {
  const r = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: await urlDaFila(FILA),
      AttributeNames: ["All"],
    }),
  );
  return r.Attributes!;
}

// O que existe de verdade, perguntado direto à "nuvem" e ao banco
async function conferir() {
  const atributos = await visibilidade();
  const redrive = JSON.parse(atributos.RedrivePolicy!);
  const tags =
    (
      await sqs.send(
        new ListQueueTagsCommand({
          QueueUrl: await urlDaFila(FILA),
        }),
      )
    ).Tags ?? {};
  const etiquetas = Object.entries(tags)
    .sort()
    .map(([k, v]) => `${k}=${v}`);
  const versoes = await s3.send(new GetBucketVersioningCommand({ Bucket: BUCKET }));
  const dono = await banco.query(`SELECT r.rolname FROM pg_database d
    JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname = 'morada_relatorios'`);
  linhas.push(
    `   fila ${FILA}: visibilidade de ${atributos.VisibilityTimeout} s`,
    `     mortas após ${redrive.maxReceiveCount} recebimentos, ` +
      `em ${redrive.deadLetterTargetArn.split(":").pop()}`,
    `     etiquetas: ${etiquetas.join(", ")}`,
    `   bucket ${BUCKET}: versionamento ${versoes.Status}`,
    `   banco morada_relatorios: dono ${dono.rows[0]?.rolname}`,
  );
}

// Sobras de uma execução interrompida (o estado do OpenTofu some com o contêiner)
async function limparSobras() {
  for (const nome of [FILA, MORTAS]) {
    try {
      await sqs.send(new DeleteQueueCommand({ QueueUrl: await urlDaFila(nome) }));
    } catch {}
  }
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    await s3.send(new DeleteBucketCommand({ Bucket: BUCKET }));
  } catch {}
  await banco.query("DROP DATABASE IF EXISTS morada_relatorios");
  await banco.query("DROP ROLE IF EXISTS relatorios");
}

await limparSobras();
linhas.push(
  "infraestrutura de homologação do Morada (OpenTofu, LocalStack e PostgreSQL)",
);

tofu("plan", "-input=false", "-out=plano.bin");
linhas.push(`1. plano inicial: ${lerPlano()}`);
tofu("apply", "-input=false", "plano.bin");
linhas.push("2. aplicado; o que existe, segundo os SDKs:");
await conferir();

const semMudar = tofu("plan", "-input=false", "-detailed-exitcode", "-out=plano.bin");
linhas.push(
  `3. plano de novo, sem mudar nada (saída ${semMudar.status}): ${lerPlano()}`,
);

await sqs.send(
  new SetQueueAttributesCommand({
    QueueUrl: await urlDaFila(FILA),
    Attributes: { VisibilityTimeout: "300" },
  }),
);
linhas.push("4. alguém muda a visibilidade da fila para 300 s, direto no console");

const deriva = tofu("plan", "-input=false", "-detailed-exitcode", "-out=plano.bin");
linhas.push(`5. plano (saída ${deriva.status}): ${lerPlano()}`);
tofu("apply", "-input=false", "plano.bin");
linhas.push(
  `6. aplicado: visibilidade de volta a ${(await visibilidade()).VisibilityTimeout} s`,
);

tofu("plan", "-input=false", "-destroy", "-out=plano.bin");
linhas.push(`7. plano de destruição: ${lerPlano()}`);
tofu("apply", "-input=false", "plano.bin");
linhas.push("8. destruído");
await banco.end();

const saida = join(process.argv[2] ?? "/dados", "saida", "infra");
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
