// Uma réplica da API de avisos. A porta 8080 atende o público; a 9090 é de
// administração, e o experimento de caos a usa para derrubar e levantar a réplica.
import http from "node:http";

const replica = process.env.REPLICA ?? "api";
const zona = process.env.ZONA ?? "a";
let publico: http.Server | null = null;

function abrir(): Promise<void> {
  if (publico) return Promise.resolve();
  const s = http.createServer((pedido, resposta) => {
    resposta.setHeader("content-type", "application/json");
    resposta.end(JSON.stringify({ replica, zona, avisos: ["Manutenção da bomba"] }));
  });
  publico = s;
  return new Promise((ok) => s.listen(8080, ok));
}

// Derrubar = parar de aceitar conexões, como um processo morto ou uma zona sem rede
function fechar(): Promise<void> {
  const s = publico;
  publico = null;
  if (!s) return Promise.resolve();
  s.closeAllConnections();
  return new Promise((ok) => s.close(() => ok()));
}

http
  .createServer(async (pedido, resposta) => {
    if (pedido.url === "/caos/derrubar") await fechar();
    if (pedido.url === "/caos/restaurar") await abrir();
    resposta.end(JSON.stringify({ replica, zona, no_ar: publico !== null }));
  })
  .listen(9090);
await abrir();
console.log(`${replica} (zona ${zona}) no ar`);
