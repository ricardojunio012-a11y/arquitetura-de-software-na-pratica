// O mesmo caso de uso escrito direto contra o SDK, sem portas: serve de
// comparação para medir o custo da abstração na versão "custo".
import {
  ConditionalCheckFailedException,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import type { Clientes } from "./clientes.ts";
import type { Nomes } from "./infra.ts";

// O endereço da fila é buscado uma vez, como faz o adaptador
export async function urlDaFila(c: Clientes, n: Nomes) {
  const fila = await c.sqs.send(new GetQueueUrlCommand({ QueueName: n.fila }));
  return fila.QueueUrl!;
}

export async function publicarDireto(
  c: Clientes,
  n: Nomes,
  url: string,
  condominio: string,
  mes: string,
  pdf: Uint8Array,
) {
  const caminho = `prestacoes/${condominio}/${mes}.pdf`;
  await c.s3.send(
    new PutObjectCommand({
      Bucket: n.bucket,
      Key: caminho,
      Body: pdf,
      ContentType: "application/pdf",
    }),
  );
  try {
    await c.dynamo.send(
      new PutItemCommand({
        TableName: n.tabela,
        Item: {
          condominio: { S: condominio },
          mes: { S: mes },
          caminho: { S: caminho },
          bytes: { N: String(pdf.length) },
        },
        ConditionExpression: "attribute_not_exists(condominio)",
      }),
    );
  } catch (erro) {
    if (erro instanceof ConditionalCheckFailedException) return "repetida";
    throw erro;
  }
  const tarefa = { tipo: "avisar-moradores", condominio, mes };
  await c.sqs.send(
    new SendMessageCommand({
      QueueUrl: url,
      MessageBody: JSON.stringify(tarefa),
    }),
  );
  return "publicada";
}

export async function avisarDireto(c: Clientes, n: Nomes, url: string) {
  const avisos: string[] = [];
  for (;;) {
    const lote = await c.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: url,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      }),
    );
    if (!lote.Messages?.length) return avisos.sort();
    for (const m of lote.Messages) {
      const { condominio, mes } = JSON.parse(m.Body!);
      const arquivo = await c.s3.send(
        new GetObjectCommand({
          Bucket: n.bucket,
          Key: `prestacoes/${condominio}/${mes}.pdf`,
        }),
      );
      const pdf = await arquivo.Body!.transformToByteArray();
      avisos.push(`${condominio} ${mes}: aviso enviado, PDF com ${pdf.length} bytes`);
      await c.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: url,
          ReceiptHandle: m.ReceiptHandle,
        }),
      );
    }
  }
}
