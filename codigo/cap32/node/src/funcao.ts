// Versão "funcao": a prestação de contas de um mês como função. Gera alguns PDFs de
// verdade com o código da função e simula o mês inteiro de chamadas.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gerarPdf } from "./funcao/prestacao.ts";
import { custo, FUNCAO, type Execucao } from "./plataforma.ts";
import {
  CONCORRENCIA_LOTE,
  MIN,
  mesDePrestacoes,
  prestacaoExemplo,
} from "./prestacoes.ts";
import { brl, numero, reais } from "./precos.ts";

const dados = process.argv[2] ?? "/dados";
const { unidades, eLote, eAvulsos } = mesDePrestacoes();
const todas = [...eLote, ...eAvulsos];
const c = custo(todas);

const pct = (n: number, de: number) => `${numero((100 * n) / de, 1)}%`;
const percentil = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.ceil((p / 100) * xs.length) - 1];
const espera = (e: Execucao[]) => e.map((x) => x.fim - x.inicio);
const frias = (e: Execucao[]) => e.filter((x) => x.fria).length;
const fimLote = Math.max(...eLote.map((e) => e.fim));
const duracaoLote = Math.round((fimLote - 2 * 60 * MIN) / 1000);
const cobradoLote = eLote.reduce((s, e) => s + e.cobrado, 0) / 1000;

const saida = [
  `função: ${FUNCAO.memoriaMb} MB; partida a frio de ${FUNCAO.inicializacao} ms; ` +
    `ambiente parado some em ${FUNCAO.ociosidade / MIN} min`,
  "",
  "PDFs gerados pelo código da função (os 3 primeiros condomínios):",
];
for (let i = 0; i < 3; i++) {
  const pdf = gerarPdf(prestacaoExemplo(i, unidades[i]));
  const hash = createHash("sha256").update(pdf).digest("hex").slice(0, 16);
  saida.push(
    `  cond-000${i + 1}  ${unidades[i]} unidades  ${pdf.length} bytes  ` +
      `sha256 ${hash}...`,
  );
  mkdirSync(join(dados, "saida", "pdf"), { recursive: true });
  writeFileSync(join(dados, "saida", "pdf", `cond-000${i + 1}.pdf`), pdf);
}
saida.push(
  "",
  "                   chamadas  partidas a frio   p50 (ms)   p99 (ms)",
  "lote do dia 1".padEnd(19) +
    numero(eLote.length, 0).padStart(8) +
    `${frias(eLote)} (${pct(frias(eLote), eLote.length)})`.padStart(17) +
    String(percentil(espera(eLote), 50)).padStart(11) +
    String(percentil(espera(eLote), 99)).padStart(11),
  "avulsos no mês".padEnd(19) +
    numero(eAvulsos.length, 0).padStart(8) +
    `${frias(eAvulsos)} (${pct(frias(eAvulsos), eAvulsos.length)})`.padStart(17) +
    String(percentil(espera(eAvulsos), 50)).padStart(11) +
    String(percentil(espera(eAvulsos), 99)).padStart(11),
  "",
  `o lote levou ${duracaoLote} s, com até ${CONCORRENCIA_LOTE} execuções ` +
    `em paralelo; tempo cobrado: ${numero(cobradoLote, 0)} s`,
  `cobrado no mês: ${numero(todas.length, 0)} requisições e ` +
    `${numero(c.gbSegundos, 0)} GB-s = US$ ${numero(c.dolares, 2)} ` +
    `(${brl(reais(c.dolares))})`,
);

const pasta = join(dados, "saida", "funcao");
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "resultado.txt"), saida.join("\n") + "\n");
console.log(saida.join("\n"));
