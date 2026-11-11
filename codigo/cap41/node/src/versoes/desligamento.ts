// Passo 5: o Acácias passa para o Morada, a rota sem uso é desligada, e a primeira
// parte do legado sai de vez: os dados do Acácias são arquivados e apagados dele.
import { createHash } from "node:crypto";
import { montar, usarAplicativo } from "../ambiente.ts";
import { relogio, Saida } from "../comum.ts";
import { chamar } from "../http.ts";
import { ACACIAS } from "../legado/banco.ts";
import { conferir } from "../migracao.ts";
import { prepararMorada, REGRAS_V2 } from "./paralelo.ts";

const ACACIAS_PREDIOS = ["P0101", "P0102", "P0103"];
const TODOS = [...ACACIAS_PREDIOS, "P0207"];

export async function desligamento(saida: Saida): Promise<void> {
  const amb = await montar();
  await prepararMorada(amb, REGRAS_V2); // a execução paralela já terminou
  const { proxy, legado } = amb;

  // A conferência é feita na virada: depois dela, a verdade do Acácias é o Morada
  const linhas = await conferir(legado, amb.morada, ACACIAS, "2026-10");
  const fechou = linhas.every((l) => l.legado === l.morada + l.quarentena);

  // As novas regras do proxy: uma mudança de configuração, que volta do mesmo jeito
  proxy.regras.push({ rota: "GET dimob", destino: "desligada" });
  for (const rota of ["GET aptos", "GET rateios", "GET inadimplentes", "POST baixa"])
    proxy.regras.push({ rota, predios: ACACIAS_PREDIOS, destino: "morada" });
  proxy.regras.push({
    rota: "POST comunicados",
    predios: ACACIAS_PREDIOS,
    destino: "morada",
  });
  // No legado, os prédios do Acácias ficam só para leitura: a escrita esquecida
  // falha alto, em vez de gravar onde ninguém mais lê
  legado.exec("UPDATE predio SET somente_leitura = 'S' WHERE cnpj = '" + ACACIAS + "'");

  saida.escrever(`${relogio.hoje}: Acácias no Morada; dimob desligada`);
  const dimob = await chamar(amb.url, "GET", "/relatorios/dimob?ano=2025");
  const { erro } = dimob.corpo as { erro: string };
  saida.escrever(`  o aplicativo antigo pede a dimob: ${dimob.status} ${erro}`);
  await usarAplicativo(amb.url, TODOS, 30, 21);

  saida.escrever(`${relogio.hoje}: 30 dias depois, chamadas por destino`);
  const soma = (filtro: (k: string[]) => boolean) =>
    [...proxy.chamadas]
      .filter(([k]) => filtro(k.split("|")))
      .reduce((s, [, n]) => s + n, 0);
  const doAcacias = (k: string[]) => ACACIAS_PREDIOS.includes(k[2]);
  saida.escrever(
    `  Acácias -> Morada: ${soma((k) => doAcacias(k) && k[1] === "morada")}`,
  );
  saida.escrever(
    `  Acácias -> legado: ${soma((k) => doAcacias(k) && k[1] === "legado")}`,
  );
  saida.escrever(`  Ipês -> legado:    ${soma((k) => k[2] === "P0207")}`);

  saida.escrever();
  saida.escrever("lista de conferência para desligar o Acácias no legado:");
  const semTrafego = soma((k) => doAcacias(k) && k[1] !== "morada") === 0;
  saida.escrever(
    `  [${semTrafego ? "x" : " "}] nenhuma chamada do Acácias ao legado em 30 dias`,
  );
  saida.escrever(`  [${fechou ? "x" : " "}] conferência aprovada no dia da virada`);
  const { rows } = await amb.morada.query<{ n: number }>(
    "SELECT count(*)::int n FROM acl.quarentena",
  );
  saida.escrever(`  [${rows[0].n === 0 ? "x" : " "}] quarentena vazia`);

  // O arquivo: tudo o que o legado tinha do Acácias, num JSON com o hash anotado
  const predios = "cod_predio IN ('P0101','P0102','P0103')";
  const arquivo: Record<string, unknown[]> = {};
  for (const t of ["apto", "rateio", "comunicado"])
    arquivo[t] = legado
      .prepare(`SELECT * FROM ${t} WHERE ${predios} ORDER BY 1, 2`)
      .all();
  const json = JSON.stringify(arquivo);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 16);
  const nLinhas = Object.values(arquivo).reduce((s, l) => s + l.length, 0);
  saida.escrever(`  [x] arquivo exportado: ${nLinhas} linhas, sha256 ${hash}`);

  saida.escrever();
  saida.escrever("desligando o Acácias no legado:");
  for (const t of ["rateio", "apto", "comunicado"]) {
    const r = legado.prepare(`DELETE FROM ${t} WHERE ${predios}`).run();
    saida.escrever(`  ${t}: ${r.changes} linhas apagadas`);
  }
  legado.exec("DELETE FROM predio WHERE cnpj = '" + ACACIAS + "'");
  // A prova: mesmo que alguém volte a regra do proxy, o legado não tem mais o Acácias
  proxy.regras = proxy.regras.filter((r) => !r.predios);
  const volta = await chamar(amb.url, "GET", "/predios/P0101/aptos");
  saida.escrever(`  regra desfeita por engano, o legado responde: ${volta.status}`);
  const resta = legado.prepare("SELECT count(*) n FROM apto").get() as { n: number };
  saida.escrever(`  o legado continua com o Ipês: 1 prédio, ${resta.n} aptos`);
  await amb.fechar();
}
