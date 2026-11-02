// A API HTTP do serviço de Comunicação: o provedor do contrato.
import http from "node:http";
import { DadosInvalidosErro, type Comunicacao } from "./dominio.ts";

export function criarApi(comunicacao: Comunicacao) {
  return http.createServer(async (req, res) => {
    const responder = (status: number, corpo: object) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(corpo));
    };
    if (req.method !== "POST" || req.url !== "/avisos") {
      return responder(404, { erro: "não encontrado" });
    }
    let texto = "";
    for await (const parte of req) texto += parte;
    const aviso = JSON.parse(texto);
    try {
      const situacao = await comunicacao.avisar(aviso.id, aviso.texto);
      responder(200, { aviso: aviso.id, situacao });
    } catch (erro) {
      if (!(erro instanceof DadosInvalidosErro)) throw erro;
      responder(400, { erro: erro.message });
    }
  });
}

// Sobe a API numa porta livre e devolve o endereço
export async function subir(servidor: http.Server): Promise<string> {
  await new Promise<void>((pronto) => servidor.listen(0, "127.0.0.1", pronto));
  const { port } = servidor.address() as { port: number };
  return `http://127.0.0.1:${port}`;
}
