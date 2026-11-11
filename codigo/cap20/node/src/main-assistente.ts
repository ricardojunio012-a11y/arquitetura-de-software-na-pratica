// A versão "assistente": uma sequência de perguntas de três condomínios ao assistente
// protegido, com a origem de cada resposta e o custo em tokens.
import { Assistente } from "./assistente.ts";
import { Orcamento } from "./guardas.ts";
import { ModeloExtrativo } from "./modelo.ts";
import { gravar, lerJson, preparar } from "./preparar.ts";

const dados = process.argv[2];
const conversa = lerJson(dados, "conversa.json");
const { banco, trechos } = await preparar(dados);
const orcamento = new Orcamento(conversa.orcamentoDiarioTokens);
const assistente = new Assistente(banco, new ModeloExtrativo(), orcamento, true);

const linhas = [`base de conhecimento: ${trechos} trechos`, ""];
for (const { condominio, pergunta } of conversa.perguntas) {
  const a = await assistente.responder(condominio, pergunta);
  const descartados = a.descartados ? `, ${a.descartados} trecho(s) descartado(s)` : "";
  linhas.push(
    `[${condominio}] ${pergunta}`,
    `     ${a.texto}`,
    `     origem: ${a.origem}, ${a.tokens} tokens${descartados}`,
  );
}
linhas.push("", "tokens gastos no dia por condomínio:");
for (const c of Object.keys(conversa.orcamentoDiarioTokens)) {
  const limite = conversa.orcamentoDiarioTokens[c];
  linhas.push(`  ${c}: ${orcamento.gasto(Number(c))} de ${limite}`);
}
await banco.end();
gravar(dados, "assistente", "conversa.txt", linhas);
console.log(`assistente: ${conversa.perguntas.length} perguntas respondidas`);
