// Uso: node http.ts memoria|postgres <pasta-de-saída>
// Sobe o adaptador HTTP com o repositório escolhido, envia as requisições
// em memória e grava as respostas e o estado final das agendas.
import fs from "node:fs";
import path from "node:path";
import { criarApi } from "../adaptadores/entrada/http.ts";
import { montar } from "./montar.ts";

const [repositorio, saida] = process.argv.slice(2);
const { servico, agendas, fechar } = await montar(repositorio, true);
const api = criarApi(servico);
const { requisicoes } = JSON.parse(
  fs.readFileSync("/dados/entrada/requisicoes.json", "utf8"),
);

const linhas: string[] = [];
for (const r of requisicoes) {
  const resposta = await api.inject({
    method: r.metodo,
    url: r.caminho,
    payload: r.corpo,
  });
  const corpo = JSON.stringify(JSON.parse(resposta.body));
  linhas.push(`${r.metodo} ${r.caminho} -> ${resposta.statusCode} ${corpo}`);
}
const estado: string[] = [];
for (const a of await agendas.todas()) {
  for (const r of a.reservas()) {
    estado.push(`${a.espaco.id};${r.id};${r.unidade};${r.data} ${r.inicio}h-${r.fim}h`);
  }
}
await fechar();

fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "respostas.txt"), linhas.join("\n") + "\n");
fs.writeFileSync(path.join(saida, "agendas.txt"), estado.join("\n") + "\n");
console.log(`${linhas.length} requisições (${repositorio}); saída em ${saida}`);
