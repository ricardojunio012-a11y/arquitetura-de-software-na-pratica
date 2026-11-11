// Segredos fora do código: a varredura, o segredo lido do cofre e a troca do segredo.
// Uso: node src/segredos.ts /dados
import { mkdirSync, writeFileSync } from "node:fs";
import { criarApi } from "./api.ts";
import { verificadorDeTokens } from "./identidade.ts";
import { chamar, EMISSOR, lerSegredo, subir, tokenDoCliente } from "./keycloak.ts";
import { varrerPasta } from "./varredura.ts";

const linhas: string[] = [];
const escrever = (s = "") => (console.log(s), linhas.push(s));
const api = criarApi("corrigido", verificadorDeTokens(EMISSOR));
const base = await subir(api);

escrever("1. varredura de segredos no código");
for (const pasta of ["antes", "depois"]) {
  const achados = varrerPasta(`exemplos/${pasta}`, "exemplos");
  escrever(`   exemplos/${pasta}: ${achados.length} achado(s)`);
  for (const a of achados) {
    escrever(`     ${a.arquivo}:${a.linha} ${a.regra} ${a.amostra}`);
  }
}

escrever("2. a integração da administradora, com o segredo lido do cofre");
const ambiente = Object.keys(process.env).filter((k) => /SEGREDO|SECRET/i.test(k));
escrever(`   variáveis de ambiente com segredo: ${ambiente.length}`);
const anterior = lerSegredo("integracao");
const t1 = await tokenDoCliente("integracao-adm1", anterior);
escrever(`   token com o segredo do cofre: ${t1.status}`);
let r = await chamar(base, "/v1/condominios/C-01/boletos", t1.token);
escrever(
  `   boletos do C-01 (administrado pela ADM-1): ${r.status}, ${r.corpo.length}`,
);
r = await chamar(base, "/v1/condominios/C-02/boletos", t1.token);
escrever(`   boletos do C-02 (de outra administradora): ${r.status}`);
const vazado = "adm1-integracao-2026-segredo"; // o valor que estava em exemplos/antes
const t0 = await tokenDoCliente("integracao-adm1", vazado);
escrever(`   token com o segredo que estava no código: ${t0.status} ${t0.erro}`);

escrever("3. troca do segredo (rotação) pela API de administração do Keycloak");
const rot = await tokenDoCliente("morada-rotacao", lerSegredo("rotacao"));
const admin = EMISSOR.replace("/realms/", "/admin/realms/");
const cabecalho = { authorization: `Bearer ${rot.token}` };
const clientes = (await (
  await fetch(`${admin}/clients?clientId=integracao-adm1`, { headers: cabecalho })
).json()) as { id: string }[];
const novo = (await (
  await fetch(`${admin}/clients/${clientes[0].id}/client-secret`, {
    method: "POST",
    headers: cabecalho,
  })
).json()) as { value: string };
writeFileSync("/run/segredos/integracao", novo.value); // o cofre guarda a versão nova
escrever(`   segredo novo gerado e gravado no cofre: ${novo.value !== anterior}`);
const velho = await tokenDoCliente("integracao-adm1", anterior);
escrever(`   token com o segredo antigo: ${velho.status} ${velho.erro}`);
const t2 = await tokenDoCliente("integracao-adm1", lerSegredo("integracao"));
escrever(`   token com o segredo novo: ${t2.status}`);
r = await chamar(base, "/v1/condominios/C-01/boletos", t1.token);
escrever(`   token emitido ANTES da troca, na API: ${r.status} (vale até expirar)`);

api.close();
mkdirSync(`${process.argv[2]}/saida/segredos`, { recursive: true });
writeFileSync(
  `${process.argv[2]}/saida/segredos/resultado.txt`,
  linhas.join("\n") + "\n",
);
