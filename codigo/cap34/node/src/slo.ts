import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gerador } from "./aleatorio.ts";
import { REGRAS, Serie, disparando, episodios } from "./sre.ts";

// Um mês da API de pagamentos do Morada, minuto a minuto, com semente fixa
const DIA = 1440;
const SLO = 0.9995; // objetivo interno
const SLA = 0.999; // o que o contrato promete

interface Incidente {
  id: string;
  descricao: string;
  inicio: number; // minuto do mês
  fim: number;
  erro: number; // fração dos pedidos que falham durante o incidente
}

const quando = (dia: number, h: number, min = 0) => (dia - 1) * DIA + h * 60 + min;

export const INCIDENTES: Incidente[] = [
  {
    id: "A",
    descricao: "gateway degradado",
    inicio: quando(5, 10, 12),
    fim: quando(5, 10, 34),
    erro: 0.08,
  },
  {
    id: "B",
    descricao: "réplica reinicia",
    inicio: quando(18, 3, 7),
    fim: quando(18, 3, 8),
    erro: 0.2,
  },
  {
    id: "C",
    descricao: "banco recusa Pix",
    inicio: quando(22, 14),
    fim: quando(22, 22),
    erro: 0.006,
  },
  {
    id: "D",
    descricao: "tempo limite curto",
    inicio: quando(26, 0),
    fim: quando(31, 0),
    erro: 0.0008,
  },
];
const RUIDO = 0.0001;

// Pedidos por minuto: pouco de madrugada, mais de dia, cinco vezes mais no dia 5
function volume(minuto: number, sortear: () => number): number {
  const dia = Math.floor(minuto / DIA) + 1;
  const hora = Math.floor((minuto % DIA) / 60);
  let base = hora < 6 ? 60 : hora < 8 ? 200 : hora < 20 ? 400 : 250;
  if (dia <= 10) base *= 1.5;
  if (dia === 5 && hora >= 8 && hora < 22) base *= 5 / 1.5;
  return Math.round(base * (0.8 + 0.4 * sortear()));
}

export function gerarMes(semente: number) {
  const sortear = gerador(semente);
  const serie = new Serie();
  const porCausa = new Map<string, number>([["ruído", 0]]);
  for (let m = 0; m < 30 * DIA; m++) {
    const pedidos = volume(m, sortear);
    const incidente = INCIDENTES.find((i) => m >= i.inicio && m < i.fim);
    let erros = 0;
    for (let p = 0; p < pedidos; p++) {
      if (incidente && sortear() < incidente.erro) {
        porCausa.set(incidente.id, (porCausa.get(incidente.id) ?? 0) + 1);
        erros++;
      } else if (sortear() < RUIDO) {
        porCausa.set("ruído", porCausa.get("ruído")! + 1);
        erros++;
      }
    }
    serie.acrescentar(pedidos, erros);
  }
  return { serie, porCausa };
}

const dois = (n: number) => String(n).padStart(2, "0");
export const hora = (minuto: number) => {
  if (minuto === 30 * DIA) return "30/11 24:00";
  const dia = Math.floor(minuto / DIA) + 1;
  const resto = minuto % DIA;
  return `${dois(dia)}/11 ${dois(Math.floor(resto / 60))}:${dois(resto % 60)}`;
};
const num = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number, casas = 0) => (100 * n).toFixed(casas).replace(".", ",") + "%";

function main() {
  const { serie, porCausa } = gerarMes(34);
  const total = serie.janela(serie.minutos, serie.minutos);
  const orcamento = Math.floor(total.pedidos * (1 - SLO));
  const limiteSla = Math.floor(total.pedidos * (1 - SLA));

  // O minuto em que o orçamento do mês acabou, e o restante ao fim de cada dia
  let esgotado = -1;
  const restante: string[] = ["dia;restante"];
  for (let m = 1; m <= serie.minutos; m++) {
    const gastos = serie.janela(m, m).erros;
    if (esgotado < 0 && gastos > orcamento) esgotado = m;
    if (m % DIA === 0)
      restante.push(`${m / DIA};${(1 - gastos / orcamento).toFixed(3)}`);
  }

  const l: string[] = [
    "API de pagamentos, novembro de 2026: 30 dias simulados, semente 34",
    "",
    `pedidos: ${num(total.pedidos)}   com erro: ${num(total.erros)}`,
    `SLI de disponibilidade: ${pct(1 - total.erros / total.pedidos, 3)}`,
    `SLO interno de ${pct(SLO, 2)}: orçamento de ${num(orcamento)} pedidos com erro,` +
      ` consumido ${pct(total.erros / orcamento)}`,
    esgotado > 0
      ? `   orçamento esgotado em ${hora(esgotado)}`
      : "   orçamento não esgotou",
    `SLA do contrato, ${pct(SLA, 1)}: limite de ${num(limiteSla)} pedidos com erro,` +
      ` ${total.erros <= limiteSla ? "cumprido" : "descumprido"}`,
    "",
    "de onde veio o consumo".padEnd(60) + "erros  do orçamento",
  ];
  for (const i of INCIDENTES) {
    const periodo = `${hora(i.inicio)} a ${hora(i.fim)}`;
    const erros = porCausa.get(i.id) ?? 0;
    l.push(
      `${i.id}  ${periodo}  ${i.descricao} (${pct(i.erro, 2)})`.padEnd(60) +
        `${num(erros).padStart(5)}  ${pct(erros / orcamento).padStart(12)}`,
    );
  }
  const ruido = porCausa.get("ruído")!;
  l.push(
    `   o mês inteiro, ruído de fundo (${pct(RUIDO, 2)})`.padEnd(60) +
      `${num(ruido).padStart(5)}  ${pct(ruido / orcamento).padStart(12)}`,
    "",
    "alertas por taxa de consumo do orçamento (multi-janela)",
    "regra                           dispara       para de disparar",
  );
  for (const r of REGRAS) {
    const eps = episodios(serie, (m) => disparando(serie, r, SLO, m));
    if (eps.length === 0) l.push(`${r.nome.padEnd(32)}nunca`);
    for (const e of eps)
      l.push(`${r.nome.padEnd(32)}${hora(e.inicio)}   ${hora(e.fim)}`);
  }

  // O alerta ingênuo: mais de 1% de erros nos últimos 5 minutos, a qualquer hora
  const ingenuo = episodios(serie, (m) => {
    const j = serie.janela(m, 5);
    return j.pedidos > 0 && j.erros / j.pedidos > 0.01;
  });
  const madrugada = ingenuo.filter((e) => e.inicio % DIA < 6 * 60);
  const durante = (i: Incidente) =>
    ingenuo.filter((e) => e.inicio >= i.inicio && e.inicio <= i.fim + 5);
  const fora = ingenuo.length - INCIDENTES.reduce((n, i) => n + durante(i).length, 0);
  const curtos = ingenuo.filter((e) => e.fim - e.inicio <= 5).length;
  l.push(
    "",
    "alerta ingênuo: mais de 1% de erros nos últimos 5 minutos",
    `notificações: ${ingenuo.length}   de madrugada (0h às 6h): ${madrugada.length}` +
      `   que duraram até 5 minutos: ${curtos}`,
    "por incidente: " +
      INCIDENTES.map((i) => `${i.id} ${durante(i).length}`).join(", ") +
      `; fora deles: ${fora}`,
    "",
  );

  const pasta = join(process.argv[2] ?? ".", "saida", "slo");
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "resultado.txt"), l.join("\n"));
  writeFileSync(join(pasta, "orcamento.csv"), restante.join("\n") + "\n");
  writeFileSync(
    join(pasta, "alerta-ingenuo.txt"),
    ingenuo.map((e) => `${hora(e.inicio)}   ${hora(e.fim)}`).join("\n") + "\n",
  );
  console.log(l.join("\n"));
}

if (process.argv[1]?.endsWith("slo.ts")) main();
