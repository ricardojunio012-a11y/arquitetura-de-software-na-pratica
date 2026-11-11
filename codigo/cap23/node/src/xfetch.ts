// A versão "xfetch": cinco minutos de pedidos ao relatório mensal, cuja geração leva
// 2 segundos, com o resultado válido por 60 segundos. Sem proteção, todo pedido que
// chega depois do vencimento e antes de o novo valor ficar pronto também gera o
// relatório. Com a expiração antecipada probabilística (XFetch, de Vattani e
// coautores), um pedido regenera o valor pouco antes de ele vencer. O tempo é
// simulado, e o sorteio tem semente: o resultado é sempre o mesmo.
import fs from "node:fs";
import path from "node:path";
import { deveRecalcular, sorteador } from "./antecipada.ts";

const VALIDADE_S = 60;
const CUSTO_S = 2;
const PEDIDOS_POR_S = 10;
const DURACAO_S = 300;

function simular(antecipada: boolean) {
  const sorteio = sorteador(2026);
  let vence = -Infinity; // o cache começa vazio
  const geracoes: number[] = []; // quando cada geração em andamento termina
  let recalculos = 0;
  let esperaram = 0;
  for (let i = 0; i < DURACAO_S * PEDIDOS_POR_S; i++) {
    const agora = i / PEDIDOS_POR_S;
    // As gerações que terminaram renovam o cache
    for (const fim of geracoes.filter((f) => f <= agora)) vence = fim + VALIDADE_S;
    geracoes.splice(0, geracoes.length, ...geracoes.filter((f) => f > agora));
    const vencido = agora >= vence;
    const recalcular = antecipada
      ? deveRecalcular(agora, vence, CUSTO_S, 1, sorteio())
      : vencido;
    if (recalcular) {
      recalculos++;
      geracoes.push(agora + CUSTO_S);
    }
    if (vencido) esperaram++;
  }
  return { recalculos, esperaram };
}

const linhas = [
  `${DURACAO_S * PEDIDOS_POR_S} pedidos em ${DURACAO_S} s, ` +
    `validade de ${VALIDADE_S} s, geração de ${CUSTO_S} s`,
];
for (const [nome, antecipada] of [
  ["vencimento fixo", false],
  ["XFetch", true],
] as const) {
  const r = simular(antecipada);
  linhas.push(
    `${nome.padEnd(16)} ${r.recalculos} gerações do relatório, ` +
      `${r.esperaram} pedidos sem valor válido no cache`,
  );
}
const saida = path.join(process.argv[2], "saida", "xfetch");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
