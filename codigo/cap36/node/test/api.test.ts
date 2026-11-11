// A API contra tokens assinados por uma chave gerada no teste: sem Keycloak.
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApi } from "../src/api.ts";
import { pessoas } from "../src/dados.ts";
import { verificadorDeTokens } from "../src/identidade.ts";

const EMISSOR = "http://emissor.test/realms/morada";
let assinar: (sub: string, papeis: string[], aud?: string) => Promise<string>;
let base = "";
const api = { idor: "", corrigido: "" };
const servidores: ReturnType<typeof criarApi>[] = [];

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const chaves = createLocalJWKSet({ keys: [jwk] });
  assinar = (sub, papeis, aud = "morada-api") =>
    new SignJWT({ realm_access: { roles: papeis }, azp: "morada-app" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(EMISSOR)
      .setAudience(aud)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  for (const modo of ["idor", "corrigido"] as const) {
    const s = criarApi(modo, verificadorDeTokens(EMISSOR, chaves));
    servidores.push(s);
    await new Promise<void>((ok) => s.listen(0, "127.0.0.1", ok));
    api[modo] = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  }
  base = api.corrigido;
});
afterAll(() => servidores.forEach((s) => s.close()));

const get = async (url: string, token?: string) =>
  (await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} }))
    .status;

describe("API de boletos", () => {
  it("sem token, 401; token para outra audiência, 401", async () => {
    expect(await get(`${base}/v1/boletos/B-1001`)).toBe(401);
    const outro = await assinar(pessoas.ana, ["morador"], "outra-api");
    expect(await get(`${base}/v1/boletos/B-1001`, outro)).toBe(401);
  });

  it("o IDOR: no modo vulnerável, ana lê o boleto de outro condomínio", async () => {
    const ana = await assinar(pessoas.ana, ["morador"]);
    expect(await get(`${api.idor}/v1/boletos/B-1005`, ana)).toBe(200);
    expect(await get(`${api.corrigido}/v1/boletos/B-1005`, ana)).toBe(404);
    expect(await get(`${api.corrigido}/v1/boletos/B-1001`, ana)).toBe(200);
  });

  it("o papel certo não basta: o síndico do C-01 não lista o C-02", async () => {
    const bruno = await assinar(pessoas.bruno, ["sindico"]);
    expect(await get(`${base}/v1/condominios/C-01/boletos`, bruno)).toBe(200);
    expect(await get(`${base}/v1/condominios/C-02/boletos`, bruno)).toBe(404);
  });

  it("papel sem acesso à função recebe 403", async () => {
    const carla = await assinar(pessoas.carla, ["porteiro"]);
    expect(await get(`${base}/v1/boletos/B-1001`, carla)).toBe(403);
  });
});
