// Adaptadores da AWS: implementam as portas com S3, SQS e DynamoDB.
// Tudo o que é da AWS fica aqui; o núcleo nunca importa o SDK.
import {
  ConditionalCheckFailedException,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import type { Clientes } from "./clientes.ts";
import type { Nomes } from "./infra.ts";
import type {
  Arquivos,
  Documento,
  Documentos,
  Nuvem,
  Tarefa,
  TarefaRecebida,
  Tarefas,
} from "./portas.ts";

export class ArquivosS3 implements Arquivos {
  private c: Clientes;
  private bucket: string;
  constructor(c: Clientes, bucket: string) {
    this.c = c;
    this.bucket = bucket;
  }
  async guardar(caminho: string, conteudo: Uint8Array, tipo: string) {
    const pedido = { Bucket: this.bucket, Key: caminho, Body: conteudo };
    await this.c.s3.send(new PutObjectCommand({ ...pedido, ContentType: tipo }));
  }
  async ler(caminho: string) {
    try {
      const pedido = { Bucket: this.bucket, Key: caminho };
      const resposta = await this.c.s3.send(new GetObjectCommand(pedido));
      return await resposta.Body!.transformToByteArray();
    } catch (erro) {
      if (erro instanceof NoSuchKey) return undefined;
      throw erro;
    }
  }
}

export class TarefasSqs implements Tarefas {
  private c: Clientes;
  private url: string;
  constructor(c: Clientes, url: string) {
    this.c = c;
    this.url = url;
  }
  async publicar(tarefa: Tarefa) {
    const pedido = { QueueUrl: this.url, MessageBody: JSON.stringify(tarefa) };
    await this.c.sqs.send(new SendMessageCommand(pedido));
  }
  async receber(maximo: number): Promise<TarefaRecebida[]> {
    const resposta = await this.c.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.url,
        MaxNumberOfMessages: Math.min(maximo, 10), // o SQS entrega até 10 por vez
        WaitTimeSeconds: 1, // espera longa: evita respostas vazias falsas
      }),
    );
    return (resposta.Messages ?? []).map((m) => ({
      tarefa: JSON.parse(m.Body!) as Tarefa,
      recibo: m.ReceiptHandle!,
    }));
  }
  async confirmar(recebida: TarefaRecebida) {
    const pedido = { QueueUrl: this.url, ReceiptHandle: recebida.recibo };
    await this.c.sqs.send(new DeleteMessageCommand(pedido));
  }
}

export class DocumentosDynamo implements Documentos {
  private c: Clientes;
  private tabela: string;
  constructor(c: Clientes, tabela: string) {
    this.c = c;
    this.tabela = tabela;
  }
  async registrarSeNovo(d: Documento) {
    try {
      await this.c.dynamo.send(
        new PutItemCommand({
          TableName: this.tabela,
          Item: {
            condominio: { S: d.condominio },
            mes: { S: d.mes },
            caminho: { S: d.caminho },
            bytes: { N: String(d.bytes) },
          },
          // Grava só se a chave não existe: a porta promete "se novo"
          ConditionExpression: "attribute_not_exists(condominio)",
        }),
      );
      return true;
    } catch (erro) {
      if (erro instanceof ConditionalCheckFailedException) return false;
      throw erro;
    }
  }
  async doCondominio(condominio: string) {
    const resposta = await this.c.dynamo.send(
      new QueryCommand({
        TableName: this.tabela,
        KeyConditionExpression: "condominio = :c",
        ExpressionAttributeValues: { ":c": { S: condominio } },
        // Por padrão, a leitura do DynamoDB é eventualmente consistente; a
        // porta promete ler o que acabou de ser gravado
        ConsistentRead: true,
      }),
    );
    return (resposta.Items ?? []).map((i) => ({
      condominio: i.condominio.S!,
      mes: i.mes.S!,
      caminho: i.caminho.S!,
      bytes: Number(i.bytes.N),
    }));
  }
}

export async function nuvemAws(c: Clientes, nomes: Nomes): Promise<Nuvem> {
  const fila = await c.sqs.send(new GetQueueUrlCommand({ QueueName: nomes.fila }));
  return {
    arquivos: new ArquivosS3(c, nomes.bucket),
    tarefas: new TarefasSqs(c, fila.QueueUrl!),
    documentos: new DocumentosDynamo(c, nomes.tabela),
  };
}
