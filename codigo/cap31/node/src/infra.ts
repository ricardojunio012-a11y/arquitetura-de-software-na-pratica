// A infraestrutura do Morada criada pelo SDK: um bucket, duas filas e uma
// tabela, com as etiquetas de custo. Cada criação confere antes se o recurso
// já existe, e por isso rodar duas vezes não muda nada (é idempotente).
import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketEncryptionCommand,
  PutBucketTaggingCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import type { Clientes } from "./clientes.ts";

export interface Nomes {
  bucket: string;
  fila: string;
  mortas: string;
  tabela: string;
}

export const nomes = (prefixo = "morada"): Nomes => ({
  bucket: `${prefixo}-prestacoes`,
  fila: `${prefixo}-avisos`,
  mortas: `${prefixo}-avisos-mortas`,
  tabela: `${prefixo}-documentos`,
});

const etiquetas = { projeto: "morada", modulo: "comunicacao" };

// Devolve uma linha por recurso: "criado" ou "já existia". A visibilidade é o
// prazo, em segundos, para o worker confirmar uma tarefa antes que ela volte
export async function provisionar(
  c: Clientes,
  n: Nomes,
  visibilidade = 30,
): Promise<string[]> {
  const b = await bucket(c, n.bucket);
  const m = await fila(c, n.mortas, {});
  const extras = {
    VisibilityTimeout: String(visibilidade),
    ...(await redirecionamento(c, n.mortas)),
  };
  const f = await fila(c, n.fila, extras);
  const t = await tabela(c, n.tabela);
  return [
    `${b.padEnd(11)}bucket  ${n.bucket}`,
    `${m.padEnd(11)}fila    ${n.mortas}`,
    `${f.padEnd(11)}fila    ${n.fila}`,
    `${t.padEnd(11)}tabela  ${n.tabela}`,
  ];
}

async function bucket(c: Clientes, nome: string) {
  try {
    await c.s3.send(new HeadBucketCommand({ Bucket: nome }));
    return "já existia";
  } catch {
    // não existe: segue para a criação
  }
  await c.s3.send(
    new CreateBucketCommand({
      Bucket: nome,
      // Fora da us-east-1, a região do bucket precisa ser dita na criação
      CreateBucketConfiguration: { LocationConstraint: c.regiao as "sa-east-1" },
    }),
  );
  const bloqueio = {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  };
  const publico = { Bucket: nome, PublicAccessBlockConfiguration: bloqueio };
  await c.s3.send(new PutPublicAccessBlockCommand(publico));
  const padrao = { SSEAlgorithm: "AES256" as const }; // chave gerenciada pelo S3
  const cifra = { Rules: [{ ApplyServerSideEncryptionByDefault: padrao }] };
  await c.s3.send(
    new PutBucketEncryptionCommand({
      Bucket: nome,
      ServerSideEncryptionConfiguration: cifra,
    }),
  );
  const TagSet = Object.entries(etiquetas).map(([Key, Value]) => ({ Key, Value }));
  await c.s3.send(new PutBucketTaggingCommand({ Bucket: nome, Tagging: { TagSet } }));
  return "criado";
}

// A fila principal manda para a de mortas o que falhar três vezes
async function redirecionamento(c: Clientes, mortas: string) {
  const url = (await c.sqs.send(new GetQueueUrlCommand({ QueueName: mortas })))
    .QueueUrl;
  const pedido = { QueueUrl: url, AttributeNames: ["QueueArn" as const] };
  const arn = (await c.sqs.send(new GetQueueAttributesCommand(pedido))).Attributes!
    .QueueArn;
  const politica = { deadLetterTargetArn: arn, maxReceiveCount: 3 };
  return { RedrivePolicy: JSON.stringify(politica) };
}

async function fila(c: Clientes, nome: string, extras: Record<string, string>) {
  try {
    await c.sqs.send(new GetQueueUrlCommand({ QueueName: nome }));
    return "já existia";
  } catch {
    // não existe: segue para a criação
  }
  await c.sqs.send(
    new CreateQueueCommand({
      QueueName: nome,
      Attributes: { SqsManagedSseEnabled: "true", ...extras },
      tags: etiquetas,
    }),
  );
  return "criado";
}

async function tabela(c: Clientes, nome: string) {
  try {
    await c.dynamo.send(new DescribeTableCommand({ TableName: nome }));
    return "já existia";
  } catch (erro) {
    if (!(erro instanceof ResourceNotFoundException)) throw erro;
  }
  await c.dynamo.send(
    new CreateTableCommand({
      TableName: nome,
      BillingMode: "PAY_PER_REQUEST", // sob demanda: paga por pedido
      AttributeDefinitions: [
        { AttributeName: "condominio", AttributeType: "S" },
        { AttributeName: "mes", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "condominio", KeyType: "HASH" },
        { AttributeName: "mes", KeyType: "RANGE" },
      ],
      Tags: Object.entries(etiquetas).map(([Key, Value]) => ({ Key, Value })),
    }),
  );
  const espera = { client: c.dynamo, maxWaitTime: 60 };
  await waitUntilTableExists(espera, { TableName: nome });
  return "criado";
}

// Apaga tudo, para cada execução do laboratório começar do zero. Na AWS de
// verdade, uma fila apagada só pode ser recriada com o mesmo nome 60 s depois
export async function destruir(c: Clientes, n: Nomes) {
  const ignorar = () => {};
  const listados = await c.s3
    .send(new ListObjectsV2Command({ Bucket: n.bucket }))
    .catch(() => undefined);
  const objetos = (listados?.Contents ?? []).map((o) => ({ Key: o.Key! }));
  if (objetos.length > 0) {
    const pedido = { Bucket: n.bucket, Delete: { Objects: objetos } };
    await c.s3.send(new DeleteObjectsCommand(pedido));
  }
  await c.s3.send(new DeleteBucketCommand({ Bucket: n.bucket })).catch(ignorar);
  for (const nome of [n.fila, n.mortas]) {
    const url = await c.sqs
      .send(new GetQueueUrlCommand({ QueueName: nome }))
      .catch(() => undefined);
    if (url) await c.sqs.send(new DeleteQueueCommand({ QueueUrl: url.QueueUrl }));
  }
  await c.dynamo.send(new DeleteTableCommand({ TableName: n.tabela })).catch(ignorar);
}
