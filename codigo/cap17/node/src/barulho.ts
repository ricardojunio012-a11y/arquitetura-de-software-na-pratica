// A versão "barulho": um servidor atende um pedido por vez, em ordem de chegada, e
// cada pedido leva servicoMs. Sem limite, a rajada de um condomínio enche a fila e
// atrasa todos. Com um balde de fichas por condomínio, a rajada é recusada (429) e os
// outros quase não esperam. O tempo é simulado, e o resultado é sempre o mesmo.
import fs from "node:fs";
import path from "node:path";
import { BaldeDeFichas } from "./balde.ts";

interface Cliente {
  condominio: number;
  inicioMs: number;
  intervaloMs: number;
}
interface Pedido {
  t: number;
  condominio: number;
}
interface Limite {
  rajada: number;
  porSegundo: number;
}

const dados = process.argv[2];
const cenario = JSON.parse(
  fs.readFileSync(path.join(dados, "entrada", "barulho.json"), "utf8"),
);

const pedidos: Pedido[] = [];
for (const c of cenario.clientes as Cliente[]) {
  for (let t = c.inicioMs; t < cenario.duracaoMs; t += c.intervaloMs) {
    pedidos.push({ t, condominio: c.condominio });
  }
}
pedidos.sort((a, b) => a.t - b.t || a.condominio - b.condominio);

function simular(limite: Limite | null): string[] {
  const contas = new Map<number, { recusados: number; esperas: number[] }>();
  const baldes = new Map<number, BaldeDeFichas>();
  let livreEm = 0;
  for (const p of pedidos) {
    if (!contas.has(p.condominio))
      contas.set(p.condominio, { recusados: 0, esperas: [] });
    const conta = contas.get(p.condominio)!;
    if (limite) {
      if (!baldes.has(p.condominio)) {
        baldes.set(p.condominio, new BaldeDeFichas(limite.rajada, limite.porSegundo));
      }
      if (!baldes.get(p.condominio)!.permite(p.t)) {
        conta.recusados++;
        continue;
      }
    }
    // O pedido espera o servidor terminar o que chegou antes dele
    const inicio = Math.max(p.t, livreEm);
    conta.esperas.push(inicio - p.t);
    livreEm = inicio + cenario.servicoMs;
  }
  return [...contas.keys()]
    .sort((a, b) => a - b)
    .map((condominio) => {
      const { recusados, esperas } = contas.get(condominio)!;
      const soma = esperas.reduce((a, b) => a + b, 0);
      const media = esperas.length ? Math.floor(soma / esperas.length) : 0;
      const maxima = esperas.length ? Math.max(...esperas) : 0;
      return (
        `condomínio ${condominio}: ${esperas.length + recusados} pedidos, ` +
        `${esperas.length} atendidos, ${recusados} recusados, ` +
        `espera média ${media} ms, máxima ${maxima} ms`
      );
    });
}

const { rajada, porSegundo } = cenario.limite;
const resultado = [
  "== sem limite",
  ...simular(null),
  "",
  `== com limite por condomínio (rajada de ${rajada}, ${porSegundo} por segundo)`,
  ...simular(cenario.limite),
];

const saida = path.join(dados, "saida", "barulho");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), resultado.join("\n") + "\n");
console.log(`barulho: ${pedidos.length} pedidos simulados`);
