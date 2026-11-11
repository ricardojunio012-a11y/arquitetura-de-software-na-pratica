// Uma réplica da API: o morador abre um WebSocket e diz a sua unidade; o porteiro
// registra um visitante por HTTP, e o aviso precisa chegar ao morador, esteja ele
// conectado a esta réplica ou à outra. Com o Redis, cada réplica publica o aviso num
// canal e todas as réplicas o recebem e entregam aos seus conectados.
import http from "node:http";
import { createClient } from "redis";
import { WebSocketServer, type WebSocket } from "ws";

const NOME = process.env.NOME ?? "api";
const conectados = new Map<string, Set<WebSocket>>(); // unidade -> conexões
let usarRedis = false;

const publicador = createClient({ url: process.env.REDIS_URL });
const assinante = publicador.duplicate();
await Promise.all([publicador.connect(), assinante.connect()]);

function entregarLocal(unidade: string, aviso: string) {
  for (const ws of conectados.get(unidade) ?? []) ws.send(`${aviso} (via ${NOME})`);
}

// Toda réplica assina o canal de avisos e entrega aos moradores conectados a ela
await assinante.subscribe("avisos", (mensagem) => {
  const { unidade, aviso } = JSON.parse(mensagem);
  entregarLocal(unidade, aviso);
});

const servidor = http.createServer(async (pedido, resposta) => {
  const url = new URL(pedido.url ?? "/", "http://localhost");
  if (url.pathname === "/modo") {
    usarRedis = url.searchParams.get("redis") === "sim";
    return resposta.end("ok");
  }
  if (pedido.method === "POST" && url.pathname === "/visitantes") {
    const unidade = url.searchParams.get("unidade")!;
    const aviso = `visitante para ${unidade}: ${url.searchParams.get("nome")}`;
    if (usarRedis)
      await publicador.publish("avisos", JSON.stringify({ unidade, aviso }));
    else entregarLocal(unidade, aviso);
    return resposta.end("registrado");
  }
  resposta.statusCode = 404;
  resposta.end();
});

new WebSocketServer({ server: servidor }).on("connection", (ws, pedido) => {
  const unidade = new URL(pedido.url ?? "/", "http://localhost").searchParams.get(
    "unidade",
  )!;
  if (!conectados.has(unidade)) conectados.set(unidade, new Set());
  conectados.get(unidade)!.add(ws);
  ws.on("close", () => conectados.get(unidade)!.delete(ws));
  ws.send("conectado");
});
servidor.listen(3000);
