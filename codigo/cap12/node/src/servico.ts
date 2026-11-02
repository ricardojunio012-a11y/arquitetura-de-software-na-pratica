// O serviço de Comunicação: o mesmo módulo, agora atrás de uma API HTTP, num
// processo e num contêiner próprios. Com FALHAS=sim, falha de propósito: a cada 25
// chamadas recusa o pedido, e a cada 40 envia o aviso mas "perde" a resposta.
import http from "node:http";
import { Comunicacao } from "./comunicacao.ts";

const falhar = process.env.FALHAS === "sim";
let comunicacao = new Comunicacao();
let chamadas = 0;

function responder(res: http.ServerResponse, status: number, corpo: object) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(corpo));
}

const servidor = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/saude") return responder(res, 200, {});
  // Só para o laboratório: começa cada execução do zero
  if (req.method === "POST" && req.url === "/reiniciar") {
    comunicacao = new Comunicacao();
    chamadas = 0;
    return responder(res, 200, {});
  }
  if (req.method !== "POST" || req.url !== "/avisos") {
    return responder(res, 404, { erro: "não encontrado" });
  }
  let texto = "";
  for await (const parte of req) texto += parte;
  const aviso = JSON.parse(texto);
  chamadas += 1;
  if (falhar && chamadas % 25 === 0)
    return responder(res, 503, { erro: "indisponível" });
  const enviado = comunicacao.avisar(aviso.id, aviso.texto);
  if (falhar && chamadas % 40 === 0)
    return responder(res, 503, { erro: "tempo esgotado" });
  responder(res, 200, { aviso: aviso.id, situacao: enviado ? "enviado" : "repetido" });
});

servidor.listen(8080, () => console.log("Comunicação ouvindo na porta 8080"));
