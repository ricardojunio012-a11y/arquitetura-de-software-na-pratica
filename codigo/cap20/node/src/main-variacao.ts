// A versão "variacao": a parte difícil da avaliação. A mesma suíte roda cinco vezes
// contra o assistente protegido com um modelo que varia, e cada execução é conferida
// de dois jeitos: pelo texto exato e pelo conteúdo, depois de normalizar a forma.
import { Assistente } from "./assistente.ts";
import { Orcamento } from "./guardas.ts";
import { NAO_SEI } from "./modelo.ts";
import { ModeloVariavel } from "./modelo-variavel.ts";
import { gravar, lerJson, preparar } from "./preparar.ts";

interface Caso {
  condominio: number;
  pergunta: string;
  deveConter: string;
}

// Conferir pelo conteúdo: as formas equivalentes viram uma só antes de comparar
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .replace(/(\d+) horas?\b/g, "$1h")
    .replace(/r\$ (\d+),00/g, "$1 reais")
    .replace(/\bquatro\b/g, "4")
    .replace(/\bseis\b/g, "6");

const dados = process.argv[2];
const { casos } = lerJson(dados, "avaliacao.json") as { casos: Caso[] };
const { banco } = await preparar(dados);
const semLimite = { "12": 1e9, "15": 1e9, "20": 1e9 };
const SEMENTES = [1, 2, 3, 4, 5];

const linhas: string[] = [];
const totais = { texto: [] as number[], conteudo: [] as number[] };
const falhasReais = new Map<string, number>();
for (const semente of SEMENTES) {
  const assistente = new Assistente(
    banco,
    new ModeloVariavel(semente),
    new Orcamento(semLimite),
    true,
  );
  let porTexto = 0;
  let porConteudo = 0;
  const erros: string[] = [];
  for (const caso of casos) {
    const { texto } = await assistente.responder(caso.condominio, caso.pergunta);
    const esperado = caso.deveConter === "nao_sabe" ? NAO_SEI : caso.deveConter;
    if (texto.includes(esperado)) porTexto++;
    if (normalizar(texto).includes(normalizar(esperado))) porConteudo++;
    else {
      const nome = `[${caso.condominio}] ${caso.pergunta}`;
      falhasReais.set(nome, (falhasReais.get(nome) ?? 0) + 1);
      erros.push(`       ${nome}`, `         respondeu: ${texto}`);
    }
  }
  totais.texto.push(porTexto);
  totais.conteudo.push(porConteudo);
  linhas.push(
    `execução ${semente}: pelo texto ${porTexto} de ${casos.length}, ` +
      `pelo conteúdo ${porConteudo} de ${casos.length}`,
    ...erros,
  );
}

const resumo = (n: number[]) => {
  const media = (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1);
  const faixa = `mínimo ${Math.min(...n)}, máximo ${Math.max(...n)}`;
  return `${faixa}, média ${media.replace(".", ",")}`;
};
linhas.push(
  "",
  `pelo texto:    ${resumo(totais.texto)}`,
  `pelo conteúdo: ${resumo(totais.conteudo)}`,
  "",
  "casos que falharam pelo conteúdo, em quantas das execuções:",
);
for (const [nome, vezes] of [...falhasReais].sort((a, b) => b[1] - a[1]))
  linhas.push(`  ${vezes} de ${SEMENTES.length}  ${nome}`);
await banco.end();
gravar(dados, "variacao", "resultado.txt", linhas);
console.log("variacao: suíte executada cinco vezes com o modelo que varia");
