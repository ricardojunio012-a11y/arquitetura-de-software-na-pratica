// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import fs from "node:fs";
import path from "node:path";
import { config } from "./config/config.ts";
import { calcularTodas, gerarSaida } from "./servicos/servicos.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
config.hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
config.dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
calcularTodas();

// A ordem importa: a inadimplência reordena a lista de cobranças
fs.mkdirSync(saida, { recursive: true });
for (const tipo of ["cobrancas", "inadimplencia", "prestacao"]) {
  fs.writeFileSync(path.join(saida, `${tipo}.txt`), gerarSaida(tipo));
}
console.log("relatórios gerados em " + saida);
