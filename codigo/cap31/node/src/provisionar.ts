// A versão "provisionar": cria a infraestrutura do Morada pelo SDK, roda de
// novo para mostrar que nada muda e confere o resultado lendo da própria nuvem.
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  GetBucketEncryptionCommand,
  GetBucketLocationCommand,
  GetBucketTaggingCommand,
  GetPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { GetQueueAttributesCommand, GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { criarClientes } from "./clientes.ts";
import { destruir, nomes, provisionar } from "./infra.ts";
import { gravar } from "./saida.ts";

const c = criarClientes();
const n = nomes();
await destruir(c, n);

const linhas = [`região: ${c.regiao}`, "primeira execução"];
for (const l of await provisionar(c, n)) linhas.push("  " + l);
linhas.push("segunda execução");
for (const l of await provisionar(c, n)) linhas.push("  " + l);

// A conferência lê cada configuração de volta, em vez de confiar no pedido
const b = { Bucket: n.bucket };
const local = await c.s3.send(new GetBucketLocationCommand(b));
const cifra = await c.s3.send(new GetBucketEncryptionCommand(b));
const algoritmo =
  cifra.ServerSideEncryptionConfiguration!.Rules![0].ApplyServerSideEncryptionByDefault!
    .SSEAlgorithm;
const bloqueio = await c.s3.send(new GetPublicAccessBlockCommand(b));
const fechado = Object.values(bloqueio.PublicAccessBlockConfiguration!).every(
  (v) => v === true,
);
const tags = (await c.s3.send(new GetBucketTaggingCommand(b))).TagSet!;
linhas.push(
  "conferência, lida da própria nuvem",
  `  bucket ${n.bucket}: ${local.LocationConstraint}, ${algoritmo}, ` +
    `acesso público ${fechado ? "bloqueado" : "ABERTO"}`,
);

const url = (await c.sqs.send(new GetQueueUrlCommand({ QueueName: n.fila }))).QueueUrl;
const pedido = { QueueUrl: url, AttributeNames: ["All" as const] };
const atributos = (await c.sqs.send(new GetQueueAttributesCommand(pedido))).Attributes!;
const politica = JSON.parse(atributos.RedrivePolicy!);
linhas.push(
  `  fila ${n.fila}: visibilidade de ${atributos.VisibilityTimeout} s, ` +
    `${politica.maxReceiveCount} entregas e depois ` +
    politica.deadLetterTargetArn.split(":").at(-1),
);

const t = await c.dynamo.send(new DescribeTableCommand({ TableName: n.tabela }));
const chave = t.Table!.KeySchema!.map((k) => k.AttributeName).join(" + ");
const modo = t.Table!.BillingModeSummary?.BillingMode ?? "PROVISIONED";
linhas.push(
  `  tabela ${n.tabela}: ${modo}, chave ${chave}, ${t.Table!.TableStatus}`,
  "  etiquetas do bucket: " +
    tags
      .map((x) => `${x.Key}=${x.Value}`)
      .sort()
      .join(", "),
);
gravar("provisionar", linhas);
