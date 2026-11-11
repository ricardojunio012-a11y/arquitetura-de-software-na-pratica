// A versão "fluxo": o mesmo núcleo, com os adaptadores em memória e com os da
// AWS (no LocalStack). O resultado precisa ser o mesmo; as chamadas são contadas.
import { nuvemAws } from "./aws.ts";
import { Contador, criarClientes } from "./clientes.ts";
import { PUBLICACOES, pdfDeMentira } from "./entrada.ts";
import { destruir, nomes, provisionar } from "./infra.ts";
import { nuvemEmMemoria } from "./memoria.ts";
import type { Nuvem } from "./portas.ts";
import { avisarMoradores, publicarPrestacao } from "./prestacao.ts";
import { gravar } from "./saida.ts";

async function rodar(nuvem: Nuvem) {
  const resultados: string[] = [];
  for (const [condominio, mes] of PUBLICACOES) {
    const pdf = pdfDeMentira(condominio, mes);
    resultados.push(await publicarPrestacao(nuvem, condominio, mes, pdf));
  }
  const avisos = await avisarMoradores(nuvem);
  const docs = await nuvem.documentos.doCondominio("102");
  return { resultados, avisos, docs: docs.length };
}

const contador = new Contador();
const c = criarClientes(contador);
const n = nomes();
await destruir(c, n);
await provisionar(c, n);
contador.zerar();

const memoria = await rodar(nuvemEmMemoria());
const aws = await rodar(await nuvemAws(c, n));

const linhas = [`${"".padEnd(28)}em memória  na AWS (LocalStack)`];
PUBLICACOES.forEach(([condominio], i) => {
  const rotulo = i > 0 && PUBLICACOES[i - 1][0] === condominio ? " de novo" : "";
  linhas.push(
    `condomínio ${condominio}${rotulo}`.padEnd(28) +
      memoria.resultados[i].padEnd(12) +
      aws.resultados[i],
  );
});
linhas.push(
  "avisos enviados".padEnd(28) +
    String(memoria.avisos.length).padEnd(12) +
    aws.avisos.length,
);
linhas.push(
  "documentos do 102".padEnd(28) + String(memoria.docs).padEnd(12) + aws.docs,
);
for (const a of aws.avisos) linhas.push("  " + a);
const iguais = JSON.stringify(memoria) === JSON.stringify(aws);
linhas.push(`mesmo resultado nos dois adaptadores: ${iguais ? "sim" : "NÃO"}`);
linhas.push(`chamadas à AWS no fluxo: ${contador.total()}`);
for (const [chave, quantas] of [...contador.chamadas].sort()) {
  linhas.push(`  ${chave.padEnd(26)}${quantas}`);
}
gravar("fluxo", linhas);
