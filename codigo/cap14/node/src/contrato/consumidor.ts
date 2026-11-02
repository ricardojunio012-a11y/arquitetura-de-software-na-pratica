// Teste de contrato do lado do consumidor. Um dublê responde exatamente o que cada
// interação promete; o cliente real do monólito conversa com ele. Se o cliente
// entende todas as respostas, as interações viram o contrato publicado.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { subir } from "../comunicacao/api.ts";
import { ClienteComunicacao } from "../monolito/cliente.ts";
import { INTERACOES, type Interacao } from "./interacoes.ts";

const saida = process.argv[2];
let atual: Interacao;

// O dublê do provedor: confere o pedido e devolve a resposta combinada
const duble = http.createServer(async (req, res) => {
  let texto = "";
  for await (const parte of req) texto += parte;
  const esperado = atual.requisicao;
  const igual =
    req.method === esperado.metodo &&
    req.url === esperado.caminho &&
    JSON.stringify(JSON.parse(texto)) === JSON.stringify(esperado.corpo);
  res.writeHead(igual ? atual.resposta.status : 500, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(igual ? atual.resposta.corpo : { erro: "pedido inesperado" }));
});
const cliente = new ClienteComunicacao(await subir(duble));

// O que o monólito precisa entender de cada resposta
const esperado: Record<string, object> = {
  "envio de um aviso novo": { ok: true, repetido: false },
  "reenvio de um aviso já enviado": { ok: true, repetido: true },
  "aviso sem texto": { ok: false, erro: "texto obrigatório" },
};

const relatorio: string[] = [];
for (const interacao of INTERACOES) {
  atual = interacao;
  const { id, texto } = interacao.requisicao.corpo as { id: string; texto: string };
  const obtido = await cliente.avisar(id, texto);
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado[interacao.descricao]);
  relatorio.push(`${interacao.descricao}: ${ok ? "o cliente entendeu" : "FALHOU"}`);
}
duble.close();

const contrato = {
  consumidor: "monolito",
  provedor: "comunicacao",
  interacoes: INTERACOES,
};
fs.mkdirSync(path.join(saida, "consumidor"), { recursive: true });
fs.writeFileSync(
  path.join(saida, "consumidor", "contrato.json"),
  JSON.stringify(contrato, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(saida, "consumidor", "relatorio.txt"),
  relatorio.join("\n") + "\n",
);
console.log(`consumidor: ${INTERACOES.length} interações no contrato`);
