// Chamadas ao Keycloak usadas pelos roteiros do laboratório.
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

export const EMISSOR = process.env.EMISSOR ?? "http://keycloak:8080/realms/morada";
const TOKEN_URL = `${EMISSOR}/protocol/openid-connect/token`;

export const lerSegredo = (nome: string) =>
  readFileSync(`/run/segredos/${nome}`, "utf8").trim();

async function pedirToken(campos: Record<string, string>) {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams(campos),
  });
  const corpo = (await r.json()) as { access_token?: string; error?: string };
  return { status: r.status, token: corpo.access_token, erro: corpo.error };
}

// Só no laboratório: o login de uma pessoa sem navegador (Direct Access Grant).
// Em produção, o fluxo é o authorization code com PKCE, pelo BFF (capítulo 13).
export async function entrar(usuario: string) {
  const r = await pedirToken({
    grant_type: "password",
    client_id: "morada-app",
    username: usuario,
    password: lerSegredo("senha_usuarios"),
    scope: "openid",
  });
  if (!r.token) throw new Error(`login de ${usuario} falhou: ${r.erro}`);
  return r.token;
}

// Sistema a sistema: client credentials (RFC 6749, seção 4.4)
export const tokenDoCliente = (clientId: string, segredo: string) =>
  pedirToken({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: segredo,
  });

export function lerClaims(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

export async function subir(api: Server): Promise<string> {
  await new Promise<void>((ok) => api.listen(0, "127.0.0.1", ok));
  return `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
}

export async function chamar(base: string, caminho: string, token?: string) {
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};
  const r = await fetch(base + caminho, { headers });
  return { status: r.status, corpo: (await r.json()) as any };
}
