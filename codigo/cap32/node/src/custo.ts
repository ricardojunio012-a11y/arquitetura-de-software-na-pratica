// Versão "custo": um mês inteiro do Morada, a API e a prestação de contas, em
// quatro formas de rodar. Só infraestrutura: pessoas ficam para o texto.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cargaDoMes, POR_DIA } from "./carga.ts";
import { PREMISSAS, simular } from "./cluster.ts";
import { configuracao, lerManifestos } from "./manifestos.ts";
import { custo } from "./plataforma.ts";
import { brl, HORAS_MES, numero, PRECOS, reais } from "./precos.ts";
import { mesDePrestacoes } from "./prestacoes.ts";

const dados = process.argv[2] ?? "/dados";
const cfg = configuracao(lerManifestos(join(dados, "k8s")));
const mes = cargaDoMes(2026);

// Pré-escala só no dia 5, das 7h30 às 10h30
const preEscala = (t: number) => {
  const dia = Math.floor(t / (POR_DIA * 15)) + 1;
  const h = (t % (POR_DIA * 15)) / 3600;
  return dia === 5 && h >= 7.5 && h < 10.5 ? 20 : cfg.minimo;
};
const comHpa = simular(cfg, mes, { nome: "HPA", minimo: preEscala });
const fixas = simular(cfg, mes, { nome: "fixas", fixas: 24 });
const nosFixos = Math.ceil(24 / Math.floor(PREMISSAS.cpuNo / cfg.cpuPorPod));
// Com Kamal, sem escalonamento automático: 9 réplicas em 3 máquinas, e 24 réplicas
// no dia 5 inteiro, com as máquinas extras pedidas na véspera (planejado)
const dia5Inteiro = (t: number) => (Math.floor(t / (POR_DIA * 15)) === 4 ? 24 : 9);
const planejado = simular(cfg, mes, { nome: "planejado", fixas: dia5Inteiro });

const plano = HORAS_MES * PRECOS.eksPorHora; // plano de controle do EKS
const nos = (segundos: number) => (segundos / 3600) * PRECOS.noPorHora;

// A prestação de contas como função
const { eLote, eAvulsos } = mesDePrestacoes();
const funcao = custo([...eLote, ...eAvulsos]).dolares;
// ... ou no cluster: um Job no dia 1 com 10 réplicas de 1 vCPU (5 nós extras pelo
// tempo do lote, mais a subida do nó) e uma réplica de 1 vCPU sempre ligada para
// os pedidos avulsos (meio nó o mês inteiro)
const tempoLote = eLote.reduce((s, e) => s + e.cobrado, 0) / 1000 / 10;
const job = nos(5 * (tempoLote + PREMISSAS.subidaNo + PREMISSAS.baixarImagem));
const sempreLigada = 0.5 * HORAS_MES * PRECOS.noPorHora;

const linhas: [string, number, string][] = [
  [
    "API no EKS, HPA e pré-escala",
    plano + nos(comHpa.noSegundos),
    `${numero(comHpa.noSegundos / 3600, 0)} nós-hora + plano`,
  ],
  [
    "API no EKS, 24 réplicas fixas",
    plano + nos(fixas.noSegundos),
    `${numero(fixas.noSegundos / 3600, 0)} nós-hora + plano`,
  ],
  [
    `API em ${nosFixos} VMs com Kamal`,
    nosFixos * HORAS_MES * PRECOS.noPorHora,
    `${nosFixos} máquinas fixas`,
  ],
  [
    "API em VMs com Kamal, planejado",
    nos(planejado.noSegundos),
    `${numero(planejado.noSegundos / 3600, 0)} nós-hora, 3 a 8 VMs`,
  ],
  ["PDF como função", funcao, `${numero(eLote.length + eAvulsos.length, 0)} chamadas`],
  ["PDF no cluster", job + sempreLigada, "Job + 1 réplica fixa"],
];

const milhoes = (mes.reduce((a, b) => a + b, 0) * 15) / 1e6;
const saida = [
  "um mês (30 dias), só infraestrutura, preços da AWS em São Paulo, " +
    "US$ 1 = R$ 5,50",
  `API: ${numero(milhoes, 1)} milhões de pedidos; ` +
    `sem resposta a tempo: HPA ${numero(comHpa.perdidos, 0)}, ` +
    `planejado ${numero(planejado.perdidos, 0)}`,
  "",
  "forma".padEnd(32) + "US$/mês".padStart(10) + "R$/mês".padStart(14) + "   base",
  ...linhas.map(
    ([nome, usd, base]) =>
      nome.padEnd(32) +
      numero(usd, 2).padStart(10) +
      brl(reais(usd)).padStart(14) +
      `   ${base}`,
  ),
];

const pasta = join(dados, "saida", "custo");
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "resultado.txt"), saida.join("\n") + "\n");
console.log(saida.join("\n"));
