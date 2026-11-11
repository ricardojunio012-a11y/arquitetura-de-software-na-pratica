// A versão "crescimento": o Morada com 10 vezes mais condomínios em três
// arquiteturas, linha por linha, e o custo por condomínio no caminho.
import { v } from "./entradas.ts";
import { gravar, numero, reais } from "./formato.ts";
import { ARQUITETURAS, custoMensal, instalacoes, somar } from "./modelo.ts";

const hoje = v("condominios");
const depois = 10 * hoje;
const saida = [
  `CRESCIMENTO DE 10x: ${numero(hoje)} para ${numero(depois)} condomínios`,
];

for (const [arq, descricao] of ARQUITETURAS) {
  const antes = custoMensal(arq, hoje);
  const apos = custoMensal(arq, depois);
  const qtd = (n: number) => instalacoes(arq, n).length;
  saida.push(
    "",
    `${arq}: ${descricao} (${qtd(hoje)} e ${qtd(depois)} instalações)`,
    `  ${"linha".padEnd(26)}${"cresce".padEnd(9)}${numero(hoje).padStart(11)}` +
      `${numero(depois).padStart(13)}${"vezes".padStart(7)}`,
  );
  for (let i = 0; i < antes.length; i++) {
    const [a, d] = [antes[i], apos[i]];
    saida.push(
      `  ${a.nome.padEnd(26)}${a.comportamento.padEnd(9)}` +
        `${reais(a.valor).padStart(11)}${reais(d.valor).padStart(13)}` +
        `${numero(d.valor / a.valor, 1).padStart(7)}`,
    );
  }
  const [ta, td] = [somar(antes), somar(apos)];
  saida.push(
    `  ${"total".padEnd(34)}${reais(ta).padStart(12)}${reais(td).padStart(13)}` +
      `${numero(td / ta, 1).padStart(7)}`,
    `  por condomínio: ${reais(ta / hoje, 2)} -> ${reais(td / depois, 2)}`,
  );
}

saida.push("", "CUSTO POR CONDOMÍNIO NO CAMINHO");
saida.push(
  `  ${"condomínios".padEnd(14)}` + ARQUITETURAS.map(([a]) => a.padStart(10)).join(""),
);
for (let k = 1; k <= 10; k++) {
  const n = k * hoje;
  const colunas = ARQUITETURAS.map(([a]) => reais(somar(custoMensal(a, n)) / n, 2));
  saida.push(`  ${numero(n).padEnd(14)}` + colunas.map((c) => c.padStart(10)).join(""));
}

gravar("crescimento", saida);
