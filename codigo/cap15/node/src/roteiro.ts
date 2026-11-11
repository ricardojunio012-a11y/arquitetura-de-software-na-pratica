// A versão "api": prepara o banco, sobe a API, envia as requisições do roteiro e
// confere cada resposta contra o contrato openapi/v1.yaml.
import fs from "node:fs";
import path from "node:path";
import { criarApi, subir } from "./api/api.ts";
import { prepararBanco } from "./api/banco.ts";
import { lerContrato } from "./contrato/openapi.ts";
import { validarResposta } from "./contrato/validar.ts";

const dados = process.argv[2];
const saida = path.join(dados, "saida", "api");
const banco = await prepararBanco(
  process.env.BANCO_URL!,
  path.join(dados, "entrada", "cobrancas.json"),
);
const contrato = lerContrato(path.join(dados, "openapi", "v1.yaml"));
const requisicoes = JSON.parse(
  fs.readFileSync(path.join(dados, "entrada", "requisicoes.json"), "utf8"),
);
const api = criarApi(banco);
const url = await subir(api);

const respostas: string[] = [];
const divergencias: string[] = [];
for (const [i, r] of requisicoes.entries()) {
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };
  // Quem chama (no lugar do token de acesso) e a chave de idempotência
  const extras: string[] = [];
  if (r.administradora) {
    cabecalhos["Morada-Administradora"] = r.administradora;
    extras.push(`Morada-Administradora: ${r.administradora}`);
  }
  if (r.chave) {
    cabecalhos["Idempotency-Key"] = r.chave;
    extras.push(`Idempotency-Key: ${r.chave}`);
  }
  const resposta = await fetch(url + r.caminho, {
    method: r.metodo,
    headers: cabecalhos,
    body: r.corpo ? JSON.stringify(r.corpo) : undefined,
  });
  const tipo = resposta.headers.get("content-type")!;
  const corpo = await resposta.json();
  const lista = extras.length ? ` (${extras.join(", ")})` : "";
  respostas.push(
    `${i + 1}. ${r.descricao}`,
    `   ${r.metodo} ${r.caminho}${lista}`,
    ...(r.corpo ? [`   ${JSON.stringify(r.corpo)}`] : []),
    `   → ${resposta.status} ${tipo}`,
    `   ${JSON.stringify(corpo)}`,
    "",
  );
  const caminho = new URL(url + r.caminho).pathname;
  divergencias.push(
    ...validarResposta(contrato, r.metodo, caminho, resposta.status, tipo, corpo),
  );
}
api.close();

const { rows: pagamentos } = await banco.query(
  "SELECT id, cobranca, valor_centavos FROM pagamentos ORDER BY id",
);
const { rows: pagas } = await banco.query(
  "SELECT id FROM cobrancas WHERE situacao = 'paga' ORDER BY id",
);
const { rows: chaves } = await banco.query(
  `SELECT administradora, string_agg(chave, ', ' ORDER BY chave) AS lista
   FROM chaves_idempotencia GROUP BY administradora ORDER BY administradora`,
);
await banco.end();
const estado = [
  `pagamentos registrados: ${pagamentos.length}`,
  ...pagamentos.map(
    (p) => `  ${p.id}: cobrança ${p.cobranca}, ${p.valor_centavos} centavos`,
  ),
  `cobranças pagas: ${pagas.map((c) => c.id).join(", ")}`,
  "chaves de idempotência guardadas:",
  ...chaves.map((c) => `  ${c.administradora}: ${c.lista}`),
];
const conferencia = [
  `${requisicoes.length} respostas conferidas com openapi/v1.yaml`,
  ...(divergencias.length ? divergencias : ["nenhuma divergência"]),
];

fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "respostas.txt"), respostas.join("\n"));
fs.writeFileSync(path.join(saida, "estado.txt"), estado.join("\n") + "\n");
fs.writeFileSync(path.join(saida, "contrato.txt"), conferencia.join("\n") + "\n");
console.log(
  `api: ${requisicoes.length} requisições, ${divergencias.length} divergências`,
);
