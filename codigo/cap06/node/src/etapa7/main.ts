// Etapa 7: a figueira estranguladora. Uma fachada recebe todos os pedidos e decide,
// espaço por espaço, quem responde: o código velho (etapa 6) ou o novo (novo.ts).
// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { avisos, relatorio, type Pedido } from "../etapa5/reservas.ts";
import { processarReservas } from "../etapa6/main.ts";
import { decidir } from "./novo.ts";

// A rota de cada espaço. "experimento": o velho responde e o novo roda junto, só
// para comparar. A cada fatia validada, um espaço muda de rota; no fim, o velho sai.
type Rota = "velho" | "experimento" | "novo";
const ROTAS: Record<string, Rota> = { salao: "novo", churrasqueira: "experimento" };
const rotaDe = (p: Pedido): Rota => ROTAS[p.espaco] ?? "velho";

type Resposta = { linha: string; email: string };

// O velho não foi feito para ser chamado assim: recebe um arquivo e grava outro.
// A fachada se adapta a ele, pelas costuras da etapa 2, sem mudar uma linha dele.
function velho(dados: any, hoje: Date): Map<string, Resposta> {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "velho-"));
  fs.writeFileSync(path.join(pasta, "pedidos.json"), JSON.stringify(dados));
  const emails: string[] = [];
  const correio = {
    enviar: (para: string, t: string) => emails.push(`para ${para}: ${t}`),
  };
  processarReservas(path.join(pasta, "pedidos.json"), pasta, hoje, correio);
  const linhas = fs.readFileSync(path.join(pasta, "reservas.txt"), "utf8").split("\n");
  return new Map(
    dados.pedidos.map((p: Pedido, i: number) => [
      p.id,
      { linha: linhas[i], email: emails[i] },
    ]),
  );
}

function novo(dados: any, hoje: Date): Map<string, Resposta> {
  const decisoes = decidir(dados, hoje);
  const linhas = relatorio(decisoes);
  const emails = avisos(decisoes).map((a) => `para ${a.para}: ${a.texto}`);
  return new Map(
    decisoes.map((d, i) => [d.pedido.id, { linha: linhas[i], email: emails[i] }]),
  );
}

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const so = (rotas: Rota[]) => ({
  ...dados,
  pedidos: dados.pedidos.filter((p: Pedido) => rotas.includes(rotaDe(p))),
});
const doVelho = velho(so(["velho", "experimento"]), hoje);
const doNovo = novo(so(["novo", "experimento"]), hoje);

// O experimento compara as duas respostas, mas quem responde ao morador é o velho
const comparados = dados.pedidos.filter((p: Pedido) => rotaDe(p) === "experimento");
const divergentes = comparados.filter(
  (p: Pedido) => JSON.stringify(doVelho.get(p.id)) !== JSON.stringify(doNovo.get(p.id)),
);
const [total, n] = [comparados.length, divergentes.length];
console.log(`experimento: ${total} pedidos comparados, ${n} com divergência`);
for (const p of divergentes) {
  const [v, nv] = [doVelho.get(p.id)!.linha, doNovo.get(p.id)!.linha];
  console.log(`  ${p.id}: velho ${v} | novo ${nv}`);
}

const respostas = dados.pedidos.map((p: Pedido) =>
  (rotaDe(p) === "novo" ? doNovo : doVelho).get(p.id)!,
);
fs.mkdirSync(saida, { recursive: true });
const gravar = (nome: string, linhas: string[]) =>
  fs.writeFileSync(path.join(saida, nome), linhas.join("\n") + "\n");
gravar(
  "reservas.txt",
  respostas.map((r: Resposta) => r.linha),
);
gravar(
  "emails.txt",
  respostas.map((r: Resposta) => r.email),
);
