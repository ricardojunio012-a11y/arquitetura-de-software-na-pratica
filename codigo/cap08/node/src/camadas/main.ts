// Uso: node main.ts <requisicoes.json> <pasta-de-saída>
// Monta as camadas de baixo para cima e envia as requisições à API, em memória
// (sem abrir porta), gravando cada resposta.
import fs from "node:fs";
import path from "node:path";
import { ServicoDeReservas } from "./aplicacao/servico-de-reservas.ts";
import { criarApi } from "./apresentacao/api.ts";
import { RepositorioDeAgendas } from "./dados/repositorio.ts";

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const api = criarApi(new ServicoDeReservas(new RepositorioDeAgendas(dados.espacos)));

const linhas: string[] = [];
for (const r of dados.requisicoes) {
  const resposta = await api.inject({
    method: r.metodo,
    url: r.caminho,
    payload: r.corpo,
  });
  const corpo = JSON.stringify(JSON.parse(resposta.body));
  linhas.push(`${r.metodo} ${r.caminho} -> ${resposta.statusCode} ${corpo}`);
}
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "respostas.txt"), linhas.join("\n") + "\n");
console.log(`${linhas.length} requisições; saída em ${saida}`);
