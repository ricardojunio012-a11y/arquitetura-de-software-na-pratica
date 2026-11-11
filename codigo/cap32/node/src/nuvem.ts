// Versão "nuvem": publica a função da prestação de contas no LocalStack, chama a
// função quatro vezes e confere o PDF gravado no bucket. Os tempos variam com a
// máquina e vão só para o terminal; o arquivo de saída tem o que não varia.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  InvokeCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionActiveV2,
  waitUntilFunctionUpdatedV2,
} from "@aws-sdk/client-lambda";
import { CreateBucketCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { gerarPdf } from "./funcao/prestacao.ts";
import { prestacaoExemplo } from "./prestacoes.ts";

const dados = process.argv[2] ?? "/dados";
const FUNCAO = "morada-prestacao";
const BUCKET = "morada-prestacoes";
const lambda = new LambdaClient({});
const s3 = new S3Client({ forcePathStyle: true });
const espera = { client: lambda, maxWaitTime: 120 };

await s3.send(new CreateBucketCommand({ Bucket: BUCKET })).catch(() => {});
await lambda.send(new DeleteFunctionCommand({ FunctionName: FUNCAO })).catch(() => {});
await lambda.send(
  new CreateFunctionCommand({
    FunctionName: FUNCAO,
    Runtime: "nodejs22.x",
    Handler: "prestacao.handler", // prestacao.mjs, a função sem os tipos
    Role: "arn:aws:iam::000000000000:role/morada-prestacao",
    Code: { ZipFile: readFileSync("/app/pacote/prestacao.zip") },
    MemorySize: 1024,
    Timeout: 30,
    Environment: { Variables: { BUCKET } },
  }),
);
await waitUntilFunctionActiveV2(espera, { FunctionName: FUNCAO });

const saida = [`função ${FUNCAO} publicada (nodejs22.x, 1024 MB)`, ""];
const tempos: string[] = [];
async function chamar(i: number, rotulo: string) {
  const evento = prestacaoExemplo(i, 50 + 40 * i);
  const inicio = performance.now();
  const r = await lambda.send(
    new InvokeCommand({
      FunctionName: FUNCAO,
      Payload: Buffer.from(JSON.stringify(evento)),
    }),
  );
  tempos.push(`${rotulo.padEnd(8)} ${Math.round(performance.now() - inicio)} ms`);
  const resposta = JSON.parse(Buffer.from(r.Payload!).toString());
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: resposta.chave }),
  );
  const noBucket = createHash("sha256")
    .update(Buffer.from(await obj.Body!.transformToByteArray()))
    .digest("hex");
  const local = createHash("sha256").update(gerarPdf(evento)).digest("hex");
  saida.push(
    `${rotulo.padEnd(8)} ${r.StatusCode} ${resposta.chave} ${resposta.bytes} bytes ` +
      `${noBucket === resposta.sha256 && noBucket === local ? "confere" : "DIFERENTE"}`,
  );
}
await chamar(0, "fria");
await chamar(1, "quente");
await chamar(2, "quente");
// Mudar a configuração descarta os ambientes: a próxima chamada é fria de novo
await lambda.send(
  new UpdateFunctionConfigurationCommand({
    FunctionName: FUNCAO,
    Environment: { Variables: { BUCKET, VERSAO: "2" } },
  }),
);
await waitUntilFunctionUpdatedV2(espera, { FunctionName: FUNCAO });
await chamar(3, "fria");

const pasta = join(dados, "saida", "nuvem");
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "resultado.txt"), saida.join("\n") + "\n");
console.log(saida.join("\n"));
console.log("\ntempo de cada chamada, medido aqui (varia a cada execução):");
console.log(tempos.join("\n"));
