// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O main faz toda a entrada e saída; o módulo de reservas não toca em arquivos.
import fs from "node:fs";
import path from "node:path";
import { avisos, decidir, relatorio } from "./reservas.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const decisoes = decidir(JSON.parse(fs.readFileSync(entrada, "utf8")), hoje);

// Aqui entraria o cliente de e-mail de verdade; no laboratório, um arquivo
const emails = avisos(decisoes).map((a) => `para ${a.para}: ${a.texto}`);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(
  path.join(saida, "reservas.txt"),
  relatorio(decisoes).join("\n") + "\n",
);
fs.writeFileSync(path.join(saida, "emails.txt"), emails.join("\n") + "\n");
