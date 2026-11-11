// A versão "custo": quanto a abstração custa em linhas de código e em chamadas
// à AWS, comparando a versão com portas e a versão direta, sem portas.
import fs from "node:fs";
import path from "node:path";
import { nuvemAws } from "./aws.ts";
import { Contador, criarClientes } from "./clientes.ts";
import { avisarDireto, publicarDireto, urlDaFila } from "./direto.ts";
import { PUBLICACOES, pdfDeMentira } from "./entrada.ts";
import { destruir, nomes, provisionar } from "./infra.ts";
import { avisarMoradores, publicarPrestacao } from "./prestacao.ts";
import { gravar } from "./saida.ts";

// Linhas de código: sem linhas em branco e sem comentários de linha inteira
function medir(arquivo: string) {
  const texto = fs.readFileSync(path.join(import.meta.dirname, arquivo), "utf8");
  const linhas = texto.split("\n").map((l) => l.trim());
  const codigo = linhas.filter((l) => l !== "" && !l.startsWith("//"));
  return { linhas: codigo.length, sdk: texto.includes("@aws-sdk/") };
}

const partes: [string, string][] = [
  ["núcleo", "prestacao.ts"],
  ["portas", "portas.ts"],
  ["adaptadores da AWS", "aws.ts"],
  ["adaptadores em memória", "memoria.ts"],
  ["versão direta, sem portas", "direto.ts"],
];
const m = Object.fromEntries(partes.map(([, arquivo]) => [arquivo, medir(arquivo)]));
const linhas = [`${"".padEnd(42)}linhas  usa o SDK`];
for (const [nome, arquivo] of partes) {
  const { linhas: n, sdk } = m[arquivo];
  linhas.push(
    `${nome} (${arquivo})`.padEnd(42) +
      String(n).padStart(6) +
      "  " +
      (sdk ? "sim" : "não"),
  );
}
const comPortas = m["prestacao.ts"].linhas + m["portas.ts"].linhas + m["aws.ts"].linhas;
const direta = m["direto.ts"].linhas;
const vezes = (comPortas / direta).toFixed(1).replace(".", ",");
linhas.push(
  `com portas (núcleo + portas + AWS): ${comPortas} linhas; direta: ${direta}` +
    ` (${vezes} vezes)`,
);

// Os arquivos do Morada que conhecem a AWS: são os que mudam numa troca de
// fornecedor. Os scripts do próprio laboratório ficam de fora da conta
const scripts = ["direto.ts", "custo.ts", "provisionar.ts", "fluxo.ts", "abandono.ts"];
const daAws = fs
  .readdirSync(import.meta.dirname)
  .filter((a) => a.endsWith(".ts") && !scripts.includes(a) && medir(a).sdk)
  .sort();
linhas.push(`arquivos do Morada que importam o SDK: ${daAws.join(", ")}`);

// As chamadas à AWS, no mesmo fluxo, nas duas versões
const contador = new Contador();
const c = criarClientes(contador);
const n = nomes();
async function chamadas(fluxo: () => Promise<unknown>) {
  await destruir(c, n);
  await provisionar(c, n);
  contador.zerar();
  await fluxo();
  return contador.total();
}
const diretas = await chamadas(async () => {
  const url = await urlDaFila(c, n);
  for (const [cond, mes] of PUBLICACOES) {
    await publicarDireto(c, n, url, cond, mes, pdfDeMentira(cond, mes));
  }
  await avisarDireto(c, n, url);
});
const porPortas = await chamadas(async () => {
  const nuvem = await nuvemAws(c, n);
  for (const [cond, mes] of PUBLICACOES) {
    await publicarPrestacao(nuvem, cond, mes, pdfDeMentira(cond, mes));
  }
  await avisarMoradores(nuvem);
});
linhas.push(
  `chamadas à AWS no mesmo fluxo: direta ${diretas}, com portas ${porPortas}`,
);
gravar("custo", linhas);
