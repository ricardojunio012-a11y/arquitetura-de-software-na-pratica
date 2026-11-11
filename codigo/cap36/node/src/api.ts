// A API de boletos do Morada, em dois modos: "idor" (confere só o token e o
// papel) e "corrigido" (confere também a relação com cada boleto).
import { createServer, type Server } from "node:http";
import { papelPermite, Relacoes, type Usuario } from "./autorizacao.ts";
import { boletos, tuplas } from "./dados.ts";
import { TokenInvalido, type Verificador } from "./identidade.ts";

export type Modo = "idor" | "corrigido";

interface Resposta {
  status: number;
  corpo: unknown;
}

const erro = (status: number, tipo: string): Resposta => ({
  status,
  corpo: { type: `https://morada.test/erros/${tipo}`, status },
});

export function criarApi(modo: Modo, verificar: Verificador): Server {
  const relacoes = new Relacoes(tuplas);
  const pode = (u: Usuario, b: (typeof boletos)[number]) =>
    modo === "idor" || relacoes.podeLerBoleto(u, b);

  async function tratar(metodo: string, url: string, auth?: string) {
    // 1. Autenticação: quem está chamando?
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return erro(401, "nao-autenticado");
    let usuario: Usuario;
    try {
      usuario = await verificar(token);
    } catch (e) {
      if (e instanceof TokenInvalido) return erro(401, "token-invalido");
      throw e;
    }
    // 2. Autorização por função (RBAC): este papel usa esta operação?
    if (!papelPermite(usuario)) return erro(403, "papel-sem-acesso");

    // 3. Autorização por objeto: este usuário pode ver ESTE boleto?
    let m = url.match(/^\/v1\/boletos\/([\w-]+)$/);
    if (metodo === "GET" && m) {
      const b = boletos.find((x) => x.id === m![1]);
      // 404 também para o que existe e não é seu: não revela que existe
      if (!b || !pode(usuario, b)) return erro(404, "boleto-inexistente");
      return { status: 200, corpo: b };
    }
    m = url.match(/^\/v1\/condominios\/([\w-]+)\/boletos$/);
    if (metodo === "GET" && m) {
      const doCondominio = boletos.filter((x) => x.condominio === m![1]);
      const visiveis = doCondominio.filter((b) => pode(usuario, b));
      if (visiveis.length === 0) return erro(404, "condominio-inexistente");
      return { status: 200, corpo: visiveis };
    }
    return erro(404, "rota-inexistente");
  }

  return createServer(async (req, res) => {
    const r = await tratar(
      req.method ?? "GET",
      req.url ?? "/",
      req.headers.authorization,
    );
    res.writeHead(r.status, { "content-type": "application/json" });
    res.end(JSON.stringify(r.corpo));
  });
}
