// A versão "unidade": a tabela de entradas, o custo de um mês do Morada como
// ele é hoje (pool, 3.000 condomínios), o custo por condomínio e por boleto,
// e o showback por módulo.
import { ENTRADAS, v } from "./entradas.ts";
import { gravar, numero, pct, reais } from "./formato.ts";
import { custoMensal, somar } from "./modelo.ts";

// Participação de cada módulo nos pedidos (premissa do laboratório)
export const PEDIDOS_POR_MODULO = {
  financeiro: 0.3,
  portaria: 0.35,
  comunicação: 0.2,
  "reservas e outros": 0.15,
};

const n = v("condominios");
const linhas = custoMensal("pool", n);
const infra = somar(linhas, "infra");
const pessoas = somar(linhas, "pessoas");
const total = infra + pessoas;
const boletos = n * v("boletos");
const saida: string[] = ["ENTRADAS"];

for (const [nome, e] of Object.entries(ENTRADAS)) {
  const valor = numero(e.valor, Number.isInteger(e.valor) ? 0 : 4);
  saida.push(`  ${nome.padEnd(16)}${valor.padStart(9)}  ${e.unidade} (${e.fonte})`);
}

saida.push("", `CUSTO DE UM MÊS: pool, ${numero(n)} condomínios`);
for (const l of linhas) {
  const coluna = `${l.tipo}, ${l.comportamento}`;
  saida.push(
    `  ${l.nome.padEnd(26)}${coluna.padEnd(18)}${reais(l.valor).padStart(11)}`,
  );
}
saida.push(
  `  ${"infraestrutura".padEnd(44)}${reais(infra).padStart(11)}`,
  `  ${"pessoas".padEnd(44)}${reais(pessoas).padStart(11)}`,
  `  ${"total (CPV)".padEnd(44)}${reais(total).padStart(11)}`,
  "",
  "POR UNIDADE",
  `  por condomínio: ${reais(total / n, 2)}` +
    ` (infra ${reais(infra / n, 2)}, pessoas ${reais(pessoas / n, 2)})`,
  `  por boleto, dividindo tudo: ${reais(total / boletos, 3)}`,
  `  CPV sobre a mensalidade: ${pct(total / n / v("mensalidade"))}`,
);

// Showback: o assistente vai direto para quem o usa; o resto é rateado
// pela participação de cada módulo nos pedidos
const direto = (etiqueta: string) =>
  linhas.filter((l) => l.etiqueta === etiqueta).reduce((s, l) => s + l.valor, 0);
const rateado = direto("compartilhado") + direto("atendimento");
saida.push("", "SHOWBACK POR MÓDULO (rateio pelos pedidos)");
for (const [modulo, fracao] of Object.entries(PEDIDOS_POR_MODULO)) {
  const valor = reais(rateado * fracao).padStart(12);
  saida.push(`  ${modulo.padEnd(20)}${pct(fracao).padStart(6)}${valor}`);
}
const assistente = reais(direto("assistente")).padStart(12);
saida.push(`  ${"assistente".padEnd(20)}${"direto".padStart(6)}${assistente}`);
const financeiro = rateado * PEDIDOS_POR_MODULO.financeiro;
saida.push(`  por boleto, só o Financeiro: ${reais(financeiro / boletos, 3)}`);

gravar("unidade", saida);
