// Versão "hpa": o dia 5 em quatro cenários, com os valores lidos de k8s/
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cargaDoMes, POR_DIA } from "./carga.ts";
import { simular, type Cenario, type Resultado } from "./cluster.ts";
import { configuracao, lerManifestos } from "./manifestos.ts";
import { numero } from "./precos.ts";

const dados = process.argv[2] ?? "/dados";
const cfg = configuracao(lerManifestos(join(dados, "k8s")));
const dia5 = cargaDoMes(2026).slice(4 * POR_DIA, 5 * POR_DIA);

const dois = (n: number) => String(Math.floor(n)).padStart(2, "0");
const hora = (t: number) => `${dois(t / 3600)}h${dois((t % 3600) / 60)}`;
const horario = (t: number) =>
  `${dois(t / 3600)}:${dois((t % 3600) / 60)}:${dois(t % 60)}`;

// Pré-escala: das 7h30 às 10h30, o mínimo sobe para 20 réplicas
export const preEscala = (t: number) =>
  t >= 7.5 * 3600 && t < 10.5 * 3600 ? 20 : cfg.minimo;

const cenarios: Cenario[] = [
  { nome: `${cfg.minimo} réplicas fixas`, fixas: cfg.minimo },
  { nome: "24 réplicas fixas", fixas: 24 },
  { nome: `HPA (${cfg.minimo} a ${cfg.maximo}, alvo ${cfg.alvo}%)` },
  { nome: "HPA com pré-escala às 7h30", minimo: preEscala },
];

const pico = dia5.indexOf(Math.max(...dia5));
const saida: string[] = [
  `dia 5: ${numero(dia5.reduce((a, b) => a + b, 0) * 15, 0)} pedidos; ` +
    `pico de ${dia5[pico]} pedidos/s às ${hora(pico * 15)}`,
  `réplica: ${cfg.cpuPorPod}m de CPU pedida; nó: 2 vCPU, 3 réplicas por nó`,
  "",
  "cenário                         lentos  sem resposta  réplicas  nós-hora" +
    "  réplicas-hora",
];
const resultados: [Cenario, Resultado][] = [];
for (const c of cenarios) {
  const r = simular(cfg, dia5, c);
  resultados.push([c, r]);
  const pct = (v: number) => `${numero((100 * v) / r.pedidos, 2)}%`;
  saida.push(
    c.nome.padEnd(30) +
      pct(r.lentos).padStart(8) +
      pct(r.perdidos).padStart(14) +
      `até ${r.maxProntas}`.padStart(10) +
      numero(r.noSegundos / 3600, 1).padStart(10) +
      numero(r.podSegundos / 3600, 1).padStart(15),
  );
}

// A linha do tempo do lembrete das 8h, minuto a minuto, nos dois cenários com HPA
function linhaDoTempo(r: Resultado): string[] {
  const linhas = [
    "hora     pedidos/s  desejadas  prontas  pendentes  nós   uso   lentos" +
      "  sem resposta",
  ];
  for (const l of r.linhas) {
    if (l.t < 8 * 3600 - 15 || l.t > 8 * 3600 + 240) continue;
    linhas.push(
      horario(l.t).padEnd(9) +
        String(l.carga).padStart(9) +
        String(l.desejadas).padStart(11) +
        String(l.prontas).padStart(9) +
        String(l.pendentes).padStart(11) +
        String(l.nos).padStart(5) +
        `${Math.round(l.uso)}%`.padStart(6) +
        numero(l.lentos, 0).padStart(9) +
        numero(l.perdidos, 0).padStart(14),
    );
  }
  return linhas;
}

const pasta = join(dados, "saida", "hpa");
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "resultado.txt"), saida.join("\n") + "\n");
writeFileSync(
  join(pasta, "lembrete-hpa.txt"),
  linhaDoTempo(resultados[2][1]).join("\n") + "\n",
);
writeFileSync(
  join(pasta, "lembrete-pre-escala.txt"),
  linhaDoTempo(resultados[3][1]).join("\n") + "\n",
);
console.log(saida.join("\n"));
console.log("\nHPA, o lembrete das 8h minuto a minuto:");
console.log(linhaDoTempo(resultados[2][1]).join("\n"));
