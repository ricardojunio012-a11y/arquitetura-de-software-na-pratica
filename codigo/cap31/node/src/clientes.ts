// Os clientes do SDK da AWS, criados num lugar só. É o único arquivo que sabe
// que, no laboratório, a "AWS" é o LocalStack: em produção, sem a variável
// AWS_ENDPOINT_URL, os mesmos clientes falam com a AWS de verdade.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";

// Conta as chamadas feitas à AWS, por serviço e por comando
export class Contador {
  readonly chamadas = new Map<string, number>();
  contar(servico: string, comando: string) {
    const chave = `${servico} ${comando}`;
    this.chamadas.set(chave, (this.chamadas.get(chave) ?? 0) + 1);
  }
  total(filtro = "") {
    let soma = 0;
    for (const [chave, n] of this.chamadas) if (chave.startsWith(filtro)) soma += n;
    return soma;
  }
  zerar() {
    this.chamadas.clear();
  }
}

export interface Clientes {
  s3: S3Client;
  sqs: SQSClient;
  dynamo: DynamoDBClient;
  regiao: string;
}

export function criarClientes(contador = new Contador()): Clientes {
  const regiao = process.env.AWS_REGION ?? "sa-east-1";
  const endpoint = process.env.AWS_ENDPOINT_URL;
  // O LocalStack não resolve nomes como bucket.s3.amazonaws.com: o S3 usa o
  // estilo de caminho (endpoint/bucket/chave)
  const s3 = new S3Client({ region: regiao, endpoint, forcePathStyle: !!endpoint });
  const sqs = new SQSClient({ region: regiao, endpoint });
  const dynamo = new DynamoDBClient({ region: regiao, endpoint });
  // Um middleware em cada cliente conta o comando antes de ele sair
  const contar = (servico: string, comando = "?") =>
    contador.contar(servico, comando.replace(/Command$/, ""));
  const opcoes = { step: "initialize" as const };
  s3.middlewareStack.add(
    (next, contexto) => async (args) => {
      contar("S3", contexto.commandName);
      return next(args);
    },
    opcoes,
  );
  sqs.middlewareStack.add(
    (next, contexto) => async (args) => {
      contar("SQS", contexto.commandName);
      return next(args);
    },
    opcoes,
  );
  dynamo.middlewareStack.add(
    (next, contexto) => async (args) => {
      contar("DynamoDB", contexto.commandName);
      return next(args);
    },
    opcoes,
  );
  return { s3, sqs, dynamo, regiao };
}
