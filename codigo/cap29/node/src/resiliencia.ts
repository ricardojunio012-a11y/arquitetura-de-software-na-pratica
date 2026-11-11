// A versão "resiliencia": o mesmo cenário com as proteções acrescentadas uma por vez,
// e o anteparo sozinho no fim.
import fs from "node:fs";
import path from "node:path";
import { AVISOS, PAGAMENTOS, type Protecoes, simular } from "./cenario.ts";

const dados = process.argv[2];
const t = { limiteMs: 300 };
const configuracoes: [string, Protecoes][] = [
  ["sem proteção", {}],
  ["+ tempo limite de 300 ms", t],
  ["+ 3 tentativas com variação", { ...t, tentativas: 3 }],
  ["+ disjuntor", { ...t, tentativas: 3, disjuntor: true }],
  ["+ anteparo de 4 vagas", { ...t, tentativas: 3, disjuntor: true, anteparo: 4 }],
  ["só o anteparo", { anteparo: 4 }],
];

const linhas = [
  "gateway: normal até 1 s, fora do ar até 4 s, instável até 6 s",
  `${"".padEnd(30)}avisos em 200 ms  maior espera  pagamentos  chamadas`,
];
for (const [nome, protecoes] of configuracoes) {
  const r = await simular(protecoes);
  linhas.push(
    nome.padEnd(30) +
      `${r.avisosRapidos} de ${AVISOS}`.padStart(15) +
      `${r.maiorEsperaAviso} ms`.padStart(14) +
      `${r.pagamentosConfirmados} de ${PAGAMENTOS}`.padStart(12) +
      `${r.chamadasAoGateway}`.padStart(10),
  );
}

const saida = path.join(dados, "saida", "resiliencia");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
