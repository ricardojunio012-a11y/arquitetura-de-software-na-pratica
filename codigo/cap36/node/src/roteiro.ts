// O roteiro do IDOR: as mesmas chamadas contra a API nos modos "idor" e "corrigido".
// Uso: node src/roteiro.ts idor|corrigido /dados
import { mkdirSync, writeFileSync } from "node:fs";
import { criarApi, type Modo } from "./api.ts";
import { boletos } from "./dados.ts";
import { verificadorDeTokens } from "./identidade.ts";
import { chamar, EMISSOR, entrar, lerClaims, subir } from "./keycloak.ts";

const modo = process.argv[2] as Modo;
const linhas: string[] = [];
const escrever = (s = "") => (console.log(s), linhas.push(s));

const api = criarApi(modo, verificadorDeTokens(EMISSOR));
const base = await subir(api);
const resumo = (r: { status: number; corpo: any }) =>
  r.status === 200
    ? Array.isArray(r.corpo)
      ? `200 (${r.corpo.length} boletos)`
      : `200 (${r.corpo.id}, unidade ${r.corpo.unidade})`
    : `${r.status} ${String(r.corpo.type).split("/").pop()}`;

escrever(`== modo: ${modo}`);
escrever("1. login no Keycloak (OIDC) e papéis no token");
const nomes = ["ana", "bruno", "carla", "dora", "edu"];
const tokens: Record<string, string> = {};
const PAPEIS = ["sindico", "morador", "porteiro", "administradora"];
for (const nome of nomes) {
  tokens[nome] = await entrar(nome);
  const c = lerClaims(tokens[nome]) as any;
  const papeis = c.realm_access.roles.filter((p: string) => PAPEIS.includes(p)).sort();
  escrever(`   ${nome.padEnd(6)} papéis: ${papeis.join(", ")}`);
}
const c = lerClaims(tokens.ana) as any;
escrever(
  `   token de ana: aud inclui morada-api: ${[c.aud].flat().includes("morada-api")}`,
);
escrever(`   validade: ${c.exp - c.iat} s`);

escrever("2. autenticação");
escrever(`   sem token, B-1001: ${resumo(await chamar(base, "/v1/boletos/B-1001"))}`);
const [cab, corpo, assinatura] = tokens.ana.split(".");
const falso = JSON.parse(Buffer.from(corpo, "base64url").toString());
falso.realm_access.roles.push("sindico");
const adulterado = [
  cab,
  Buffer.from(JSON.stringify(falso)).toString("base64url"),
  assinatura,
];
let r = await chamar(base, "/v1/boletos/B-1001", adulterado.join("."));
escrever(`   ana com o papel de síndica forjado no token: ${resumo(r)}`);
const semAssinatura = [
  Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
  corpo,
  "",
].join(".");
r = await chamar(base, "/v1/boletos/B-1001", semAssinatura);
escrever(`   token com alg "none": ${resumo(r)}`);

escrever("3. autorização por papel (RBAC)");
r = await chamar(base, "/v1/boletos/B-1001", tokens.ana);
escrever(`   ana lê o boleto da própria unidade: ${resumo(r)}`);
r = await chamar(base, "/v1/boletos/B-1001", tokens.carla);
escrever(`   carla (porteira) lê o mesmo boleto: ${resumo(r)}`);

escrever("4. autorização por objeto (o IDOR)");
r = await chamar(base, "/v1/boletos/B-1002", tokens.ana);
escrever(`   ana lê o boleto do vizinho (102): ${resumo(r)}`);
r = await chamar(base, "/v1/boletos/B-1005", tokens.ana);
escrever(`   ana lê um boleto do condomínio C-02: ${resumo(r)}`);
r = await chamar(base, "/v1/condominios/C-01/boletos", tokens.edu);
escrever(`   edu (C-02) lista os boletos do C-01: ${resumo(r)}`);

escrever("5. enumeração: cada um tenta os 12 boletos, de B-1001 a B-1012");
for (const nome of ["ana", "bruno", "dora", "edu"]) {
  const lidos: string[] = [];
  for (const b of boletos) {
    if ((await chamar(base, `/v1/boletos/${b.id}`, tokens[nome])).status === 200) {
      lidos.push(b.condominio);
    }
  }
  const conds = [...new Set(lidos)].join(", ");
  escrever(
    `   ${nome.padEnd(6)} lê ${String(lidos.length).padStart(2)} de 12 (${conds})`,
  );
}

api.close();
mkdirSync(`${process.argv[3]}/saida/${modo}`, { recursive: true });
writeFileSync(
  `${process.argv[3]}/saida/${modo}/resultado.txt`,
  linhas.join("\n") + "\n",
);
