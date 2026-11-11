// Autenticação: a API confere o token de acesso emitido pelo Keycloak.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Usuario } from "./autorizacao.ts";

export type Verificador = (token: string) => Promise<Usuario>;

export class TokenInvalido extends Error {}

export function verificadorDeTokens(emissor: string, chaves?: JWTVerifyGetKey) {
  // As chaves públicas vêm do próprio emissor (JWKS) e ficam em cache
  const jwks =
    chaves ?? createRemoteJWKSet(new URL(`${emissor}/protocol/openid-connect/certs`));
  const verificar: Verificador = async (token) => {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: emissor, // emitido pelo nosso Keycloak, e não por outro
        audience: "morada-api", // emitido para esta API, e não para outra
        algorithms: ["RS256"], // nunca "none", nunca o algoritmo que o token pedir
      });
      const papeis = (payload.realm_access as { roles?: string[] })?.roles ?? [];
      // Conta de serviço (client credentials): quem chama é o cliente, não uma pessoa
      const servico = String(payload.preferred_username ?? "").startsWith(
        "service-account-",
      );
      const id = servico ? `cliente:${payload.azp}` : String(payload.sub);
      return { id, papeis };
    } catch (e) {
      throw new TokenInvalido((e as { code?: string }).code ?? "ERR_DESCONHECIDO");
    }
  };
  return verificar;
}
