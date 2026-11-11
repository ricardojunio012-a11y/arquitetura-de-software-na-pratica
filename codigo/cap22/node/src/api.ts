// Uma réplica da API do painel. A porta 3000 atende os síndicos, atrás do
// balanceador; a porta 3001 é a de administração do laboratório, usada pelos cenários
// para escolher onde guardar as sessões e para desligar e religar a réplica.
import { randomUUID } from "node:crypto";
import http from "node:http";
import { type Sessoes, SessoesEmMemoria, SessoesNoRedis } from "./sessoes.ts";

const NOME = process.env.NOME ?? "api";
const guardas: Record<string, Sessoes> = {
  memoria: new SessoesEmMemoria(),
  redis: await SessoesNoRedis.conectar(process.env.REDIS_URL!),
};
let sessoes = guardas.memoria;
let atendidos = 0;

function cookie(pedido: http.IncomingMessage, nome: string) {
  const achado = (pedido.headers.cookie ?? "").match(new RegExp(`${nome}=([^;]+)`));
  return achado?.[1] ?? null;
}

const publica = http.createServer(async (pedido, resposta) => {
  atendidos++;
  resposta.setHeader("x-replica", NOME);
  if (pedido.method === "POST" && pedido.url === "/login") {
    const id = randomUUID();
    await sessoes.criar(id, "Ana Souza");
    resposta.setHeader("set-cookie", `sid=${id}; HttpOnly; Path=/`);
    return resposta.end("ok");
  }
  if (pedido.url === "/painel") {
    const sid = cookie(pedido, "sid");
    const sindico = sid ? await sessoes.buscar(sid) : null;
    resposta.statusCode = sindico ? 200 : 401;
    return resposta.end(sindico ? `painel de ${sindico}` : "faça login");
  }
  resposta.statusCode = 404;
  resposta.end();
});
publica.listen(3000);

// Administração: só os cenários do laboratório chamam estas rotas
http
  .createServer((pedido, resposta) => {
    const url = new URL(pedido.url ?? "/", "http://localhost");
    const atendidosAntes = atendidos;
    if (url.pathname === "/modo") sessoes = guardas[url.searchParams.get("sessao")!];
    if (url.pathname === "/zerar") atendidos = 0;
    // Parar de aceitar conexões imita uma réplica que caiu
    if (url.pathname === "/desligar") publica.close();
    if (url.pathname === "/religar" && !publica.listening) publica.listen(3000);
    resposta.end(String(atendidosAntes));
  })
  .listen(3001);

// Desligamento gracioso. No deploy, o Docker ou o Kubernetes mandam SIGTERM e, depois
// de um prazo, SIGKILL. A réplica para de aceitar conexões, deixa terminar os pedidos
// em andamento e só então sai; o prazo próprio evita esperar para sempre.
process.on("SIGTERM", () => {
  publica.close(() => process.exit(0));
  publica.closeIdleConnections();
  setTimeout(() => process.exit(1), 8000).unref();
});
