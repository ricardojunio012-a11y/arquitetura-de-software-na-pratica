// Uso: node main.ts online|offline|reinicio|persistida <pasta-de-saída>
// Simula uma manhã na portaria com dois tablets. Na versão offline, o tablet A perde
// a internet, trabalha com a fila local e sincroniza ao voltar. Nas versões reinicio
// e persistida, o BFF reinicia entre o envio perdido e o reenvio.
import fs from "node:fs";
import path from "node:path";
import { Portaria, Reservas } from "./backend.ts";
import { BffPorteiro } from "./bff.ts";
import { Tablet } from "./tablet.ts";

const [versao, saida] = process.argv.slice(2);
const cenario = JSON.parse(fs.readFileSync("/dados/entrada/cenario.json", "utf8"));
const portaria = new Portaria(cenario.encomendas);
const reservas = new Reservas(cenario.convidados);
// Na versão persistida, o resultado de cada operação vai para uma tabela que
// sobrevive ao processo do BFF; nas outras, fica só na memória dele
const tabelaDeOperacoes = new Map<string, string>();
const novoBff = () =>
  new BffPorteiro(
    portaria,
    reservas,
    versao === "persistida" ? tabelaDeOperacoes : new Map(),
  );
let bff = novoBff();
const registro: string[] = [];
const tablets: Record<string, Tablet> = {
  A: new Tablet("A", () => bff, registro),
  B: new Tablet("B", () => bff, registro),
};

for (const passo of cenario.passos) {
  if (passo.so && !passo.so.includes(versao)) continue;
  if (passo.acao === "reiniciarBff") {
    bff = novoBff();
    registro.push("o BFF reiniciou: o que estava só na memória dele se perdeu");
    continue;
  }
  const tablet = tablets[passo.tablet];
  if (passo.acao === "abrir") tablet.abrir();
  else if (passo.acao === "desconectar") tablet.desconectar();
  else if (passo.acao === "reconectar") tablet.reconectar(passo.perderResposta);
  else if (passo.acao === "reenviar") tablet.reenviar();
  else {
    const { tablet: _, acao, ...dados } = passo;
    tablet.operar({ tipo: acao, ...dados });
  }
}

const estado = [...portaria.encomendas.values()].map((e) =>
  e.por
    ? `${e.encomenda} ${e.unidade}: ${e.situacao} pelo tablet ${e.por} às ${e.hora}`
    : `${e.encomenda} ${e.unidade}: ${e.situacao}`,
);
for (const v of portaria.visitantes) {
  estado.push(`${v.nome} (${v.reserva}) entrou às ${v.hora} pelo tablet ${v.tablet}`);
}
estado.push(`operações repetidas ignoradas: ${bff.repetidas}`);

fs.mkdirSync(path.join(saida, versao), { recursive: true });
fs.writeFileSync(path.join(saida, versao, "registro.txt"), registro.join("\n") + "\n");
fs.writeFileSync(path.join(saida, versao, "estado.txt"), estado.join("\n") + "\n");
console.log(`${versao}: saída em ${saida}/${versao}`);
