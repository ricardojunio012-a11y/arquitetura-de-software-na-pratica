// Servidores e chamadas HTTP de verdade, em portas sorteadas pelo sistema dentro do
// contêiner. Nenhuma porta é publicada no host.
import { createServer } from "node:http";

export type Resposta = { status: number; corpo: unknown };
export type Tratador = (
  metodo: string,
  caminho: string,
  corpo: unknown,
) => Promise<Resposta>;

export type Servidor = { url: string; fechar: () => Promise<void> };

export async function servir(tratar: Tratador): Promise<Servidor> {
  const servidor = createServer(async (req, res) => {
    let texto = "";
    for await (const parte of req) texto += parte;
    const corpo = texto ? JSON.parse(texto) : undefined;
    let r: Resposta;
    try {
      r = await tratar(req.method ?? "GET", req.url ?? "/", corpo);
    } catch (e) {
      r = { status: 500, corpo: { erro: String(e) } };
    }
    res.writeHead(r.status, { "content-type": "application/json" });
    res.end(JSON.stringify(r.corpo));
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const endereco = servidor.address();
  const porta = typeof endereco === "object" && endereco ? endereco.port : 0;
  return {
    url: `http://127.0.0.1:${porta}`,
    fechar: () => new Promise((ok) => servidor.close(() => ok())),
  };
}

export async function chamar(
  base: string,
  metodo: string,
  caminho: string,
  corpo?: unknown,
): Promise<Resposta> {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: r.status, corpo: await r.json() };
}

// Separa o caminho e a consulta: "/a/b?comp=10/2026" vira ["a", "b"] e {comp: ...}
export function partes(caminho: string): {
  seg: string[];
  q: URLSearchParams;
} {
  const [p, consulta] = caminho.split("?");
  return { seg: p.split("/").filter(Boolean), q: new URLSearchParams(consulta) };
}
