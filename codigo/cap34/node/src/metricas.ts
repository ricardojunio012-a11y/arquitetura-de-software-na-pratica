import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Attributes, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { hrTimeToMilliseconds } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  type HistogramMetricData,
  MeterProvider,
  MetricReader,
} from "@opentelemetry/sdk-metrics";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";
import { duracao, gerador } from "./aleatorio.ts";
import { ExportadorEmMemoria, IdsComSemente, em, tracers } from "./telemetria.ts";

// Dez minutos de tráfego da API do Morada, gerados com semente: pagamentos e
// consultas de cobranças, com erros e uma cauda de lentidão
interface Pedido {
  rota: string;
  metodo: string;
  status: number;
  ms: number;
  inicio: number;
  condominio: number;
}

export function trafego(semente: number): Pedido[] {
  const sortear = gerador(semente);
  const pedidos: Pedido[] = [];
  for (let i = 0; i < 4200; i++) {
    const pagamento = i % 7 < 2; // 1.200 pagamentos e 3.000 consultas
    const condominio = 1 + Math.floor(sortear() * 3000);
    const falhou = sortear() < (pagamento ? 0.015 : 0.002);
    const ms = falhou && pagamento ? 300 : duracao(sortear, pagamento ? 180 : 40);
    pedidos.push({
      rota: pagamento ? "/v1/pagamentos" : "/v1/cobrancas",
      metodo: pagamento ? "POST" : "GET",
      status: falhou ? (pagamento ? 504 : 500) : pagamento ? 201 : 200,
      ms,
      inicio: Math.floor((i * 600_000) / 4200),
      condominio,
    });
  }
  return pedidos;
}

// Um leitor de métricas acionado à mão: o programa pede a coleta quando quer
class LeitorManual extends MetricReader {
  protected async onShutdown(): Promise<void> {}
  protected async onForceFlush(): Promise<void> {}
}

// Os baldes padrão da convenção semântica para durações HTTP, em segundos
const BALDES = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
];

async function histograma(pedidos: Pedido[], comCondominio: boolean) {
  const leitor = new LeitorManual();
  const provedor = new MeterProvider({
    resource: resourceFromAttributes({ "service.name": "financeiro" }),
    readers: [leitor],
  });
  const duracaoHttp = provedor
    .getMeter("morada")
    .createHistogram("http.server.request.duration", {
      unit: "s",
      advice: { explicitBucketBoundaries: BALDES },
    });
  for (const p of pedidos) {
    const atributos: Attributes = {
      "http.request.method": p.metodo,
      "http.route": p.rota,
      "http.response.status_code": p.status,
    };
    if (comCondominio) atributos["morada.condominio"] = p.condominio; // não faça isso
    duracaoHttp.record(p.ms / 1000, atributos);
  }
  const { resourceMetrics } = await leitor.collect();
  return resourceMetrics.scopeMetrics[0].metrics[0] as HistogramMetricData;
}

// O percentil estimado a partir dos baldes, como faz o histogram_quantile do Prometheus
export function percentilDosBaldes(limites: number[], contagens: number[], q: number) {
  const total = contagens.reduce((a, b) => a + b, 0);
  let acumulado = 0;
  for (let i = 0; i < contagens.length; i++) {
    if (acumulado + contagens[i] >= q * total) {
      const de = i === 0 ? 0 : limites[i - 1];
      const ate = limites[i] ?? limites[limites.length - 1];
      return de + ((ate - de) * (q * total - acumulado)) / contagens[i];
    }
    acumulado += contagens[i];
  }
  return limites[limites.length - 1];
}

function percentilExato(valores: number[], q: number): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.ceil(q * ordenados.length) - 1];
}

const num = (n: number) => n.toLocaleString("pt-BR");
const dec = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");

async function main() {
  const pedidos = trafego(34);
  const linhas: string[] = ["Dez minutos da API do Financeiro: 4.200 pedidos", ""];

  // 1. RED por rota, a partir do histograma de duração
  const h = await histograma(pedidos, false);
  linhas.push(
    "1. RED por rota (taxa, erros, duração)",
    "rota                   taxa  erros     p50     p95     p99  p95 pelos baldes",
  );
  for (const rota of ["/v1/pagamentos", "/v1/cobrancas"]) {
    const daRota = pedidos.filter((p) => p.rota === rota);
    const erros = daRota.filter((p) => p.status >= 500).length;
    const pontos = h.dataPoints.filter((d) => d.attributes["http.route"] === rota);
    const contagens = BALDES.map((_, i) =>
      pontos.reduce((s, d) => s + d.value.buckets.counts[i], 0),
    );
    contagens.push(
      pontos.reduce((s, d) => s + d.value.buckets.counts[BALDES.length], 0),
    );
    const ms = daRota.map((p) => p.ms);
    const p95b = percentilDosBaldes(BALDES, contagens, 0.95) * 1000;
    linhas.push(
      `${daRota[0].metodo.padEnd(5)}${rota.padEnd(15)}` +
        `${(dec(daRota.length / 600) + "/s").padStart(7)}` +
        `${(dec((100 * erros) / daRota.length) + "%").padStart(7)}` +
        [0.5, 0.95, 0.99]
          .map((q) => `${percentilExato(ms, q)} ms`.padStart(8))
          .join("") +
        `${Math.round(p95b)} ms`.padStart(18),
    );
  }

  // 2. Cardinalidade: o mesmo histograma, com e sem o condomínio como atributo
  const comCondominio = await histograma(pedidos, true);
  const porSerie = BALDES.length + 3; // os baldes, o +Inf, a soma e a contagem
  const series = (nome: string, n: number) =>
    nome.padEnd(40) + num(n).padStart(7) + num(n * porSerie).padStart(23);
  linhas.push(
    "",
    "2. Cardinalidade do histograma de duração",
    "atributos                                séries   séries no Prometheus",
    series("método, rota e status", h.dataPoints.length),
    series("método, rota, status e condomínio", comCondominio.dataPoints.length),
  );

  // 3. Amostragem: um trecho por pedido, guardado inteiro, na cabeça ou na cauda
  const todos = new ExportadorEmMemoria();
  const cabeca = new ExportadorEmMemoria();
  const t1 = tracers(["financeiro"], todos, new IdsComSemente(7)).financeiro;
  const amostrador = new TraceIdRatioBasedSampler(0.1);
  const t2 = tracers(
    ["financeiro"],
    cabeca,
    new IdsComSemente(7),
    amostrador,
  ).financeiro;
  for (const p of pedidos) {
    for (const t of [t1, t2]) {
      const s = t.startSpan(`${p.metodo} ${p.rota}`, {
        kind: SpanKind.SERVER,
        startTime: em(p.inicio),
      });
      if (p.status >= 500) s.setStatus({ code: SpanStatusCode.ERROR });
      s.end(em(p.inicio + p.ms));
    }
  }
  const lento = 400;
  const duracaoMs = (s: (typeof todos.trechos)[number]) =>
    hrTimeToMilliseconds(s.endTime) - hrTimeToMilliseconds(s.startTime);
  const erro = (s: (typeof todos.trechos)[number]) =>
    s.status.code === SpanStatusCode.ERROR;
  // a cauda decide depois de ver o rastro: guarda erros, lentos e 10% do resto
  const cauda = todos.trechos.filter(
    (s) =>
      erro(s) ||
      duracaoMs(s) > lento ||
      parseInt(s.spanContext().traceId.slice(-8), 16) / 2 ** 32 < 0.1,
  );
  const linha = (nome: string, ts: typeof todos.trechos) =>
    `${nome.padEnd(36)}${num(ts.length).padStart(6)}` +
    `${String(ts.filter(erro).length).padStart(10)}` +
    `${String(ts.filter((s) => duracaoMs(s) > lento).length).padStart(10)}`;
  linhas.push(
    "",
    `3. Amostragem de rastros (lento: acima de ${lento} ms)`,
    "estratégia                          rastros  com erro    lentos",
    linha("guardar tudo", todos.trechos),
    linha("na cabeça, 10% pelo trace_id", cabeca.trechos),
    linha("na cauda, erros, lentos e 10%", cauda),
    "",
  );

  const pasta = join(process.argv[2] ?? ".", "saida", "metricas");
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "resultado.txt"), linhas.join("\n"));
  console.log(linhas.join("\n"));
}

if (process.argv[1]?.endsWith("metricas.ts")) await main();
