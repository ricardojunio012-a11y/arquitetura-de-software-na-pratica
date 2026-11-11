// A versão "avaliacao": a mesma suíte de casos contra o assistente ingênuo e contra o
// protegido. Um caso passa se a resposta contém o texto esperado ou, quando o certo é
// não saber, se o assistente admite que não encontrou.
import { Assistente } from "./assistente.ts";
import { Orcamento } from "./guardas.ts";
import { ModeloExtrativo, NAO_SEI } from "./modelo.ts";
import { gravar, lerJson, preparar } from "./preparar.ts";

interface Caso {
  condominio: number;
  pergunta: string;
  deveConter: string;
}

const dados = process.argv[2];
const { casos } = lerJson(dados, "avaliacao.json") as { casos: Caso[] };
const { banco } = await preparar(dados);
const semLimite = { "12": 1e9, "15": 1e9, "20": 1e9 };

const linhas: string[] = [];
for (const protegido of [false, true]) {
  const nome = protegido ? "assistente protegido" : "assistente ingênuo";
  const assistente = new Assistente(
    banco,
    new ModeloExtrativo(),
    new Orcamento(semLimite),
    protegido,
  );
  let acertos = 0;
  linhas.push(`== ${nome}`);
  for (const caso of casos) {
    const { texto } = await assistente.responder(caso.condominio, caso.pergunta);
    const esperado = caso.deveConter === "nao_sabe" ? NAO_SEI : caso.deveConter;
    const passou = texto.includes(esperado);
    if (passou) acertos++;
    linhas.push(
      `${passou ? "ok    " : "FALHOU"} [${caso.condominio}] ${caso.pergunta}`,
    );
    if (!passou) linhas.push(`       respondeu: ${texto}`);
  }
  linhas.push(`acertos: ${acertos} de ${casos.length}`, "");
}
await banco.end();
gravar(dados, "avaliacao", "resultado.txt", linhas);
console.log("avaliacao: suíte executada nos dois assistentes");
