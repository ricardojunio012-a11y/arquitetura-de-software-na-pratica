import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { hrTimeToMilliseconds } from "@opentelemetry/core";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { pagar } from "./pagamento.ts";
import { ExportadorEmMemoria, IdsComSemente, Log, tracers } from "./telemetria.ts";

const SERVICOS = ["aplicativo", "financeiro", "financeiro-relay", "comunicacao"];
const TIPOS: Record<number, string> = {
  [SpanKind.INTERNAL]: "interno",
  [SpanKind.SERVER]: "servidor",
  [SpanKind.CLIENT]: "cliente",
  [SpanKind.PRODUCER]: "produtor",
  [SpanKind.CONSUMER]: "consumidor",
};

const ms = (s: ReadableSpan, fim = false) =>
  hrTimeToMilliseconds(fim ? s.endTime : s.startTime);
const servico = (s: ReadableSpan) => String(s.resource.attributes["service.name"]);

function rodar(traceparentNaOutbox: boolean) {
  const exportador = new ExportadorEmMemoria();
  const log = new Log();
  const t = tracers(SERVICOS, exportador, new IdsComSemente(34));
  pagar(t, log, { cobranca: "C-2026-11-0412", morador: "M-8812", traceparentNaOutbox });
  return { trechos: exportador.trechos, log };
}

// Desenha cada rastro como árvore: início e duração em ms, serviço e trecho
function arvore(trechos: ReadableSpan[]): string[] {
  const t0 = Math.min(...trechos.map((s) => ms(s)));
  const filhos = new Map<string, ReadableSpan[]>();
  const ids = new Set(trechos.map((s) => s.spanContext().spanId));
  const raizes: ReadableSpan[] = [];
  for (const s of [...trechos].sort((a, b) => ms(a) - ms(b))) {
    const pai = s.parentSpanContext?.spanId;
    if (pai && ids.has(pai)) filhos.set(pai, [...(filhos.get(pai) ?? []), s]);
    else raizes.push(s);
  }
  const linhas: string[] = [];
  const visitar = (s: ReadableSpan, nivel: number) => {
    const inicio = String(ms(s) - t0).padStart(6);
    const duracao = String(ms(s, true) - ms(s)).padStart(5);
    const status = s.attributes["http.response.status_code"];
    const erro =
      s.status.code === SpanStatusCode.ERROR ? ` ERRO: ${s.status.message}` : "";
    const nome = `${"  ".repeat(nivel)}${s.name} (${TIPOS[s.kind]})`;
    const fim = status ? ` ${status}` : erro;
    linhas.push(`${inicio} ${duracao} ms  ${servico(s).padEnd(17)}${nome}${fim}`);
    for (const f of filhos.get(s.spanContext().spanId) ?? []) visitar(f, nivel + 1);
  };
  for (const r of raizes) {
    const doRastro = trechos.filter(
      (s) => s.spanContext().traceId === r.spanContext().traceId,
    );
    const fim = Math.max(...doRastro.map((s) => ms(s, true)));
    const servicos = new Set(doRastro.map(servico)).size;
    linhas.push(
      "",
      `rastro ${r.spanContext().traceId}: ${doRastro.length} trechos, ` +
        `${servicos} serviços, ${fim - ms(r)} ms`,
      "início  duração   serviço          trecho",
    );
    visitar(r, 0);
  }
  return linhas;
}

function jsonl(trechos: ReadableSpan[]): string {
  return trechos
    .map((s) =>
      JSON.stringify({
        trace_id: s.spanContext().traceId,
        span_id: s.spanContext().spanId,
        parent_span_id: s.parentSpanContext?.spanId ?? null,
        servico: servico(s),
        nome: s.name,
        tipo: TIPOS[s.kind],
        inicio: new Date(ms(s)).toISOString(),
        fim: new Date(ms(s, true)).toISOString(),
        atributos: s.attributes,
        status: s.status.code === SpanStatusCode.ERROR ? s.status.message : "ok",
      }),
    )
    .join("\n");
}

const pasta = join(process.argv[2] ?? ".", "saida", "rastro");
mkdirSync(pasta, { recursive: true });

const certo = rodar(true);
const quebrado = rodar(false);
const email = (l: Log) => JSON.parse(l.linhas.at(-1) ?? "{}").trace_id as string;
const pagamento = certo.trechos
  .find((s) => !s.parentSpanContext)
  ?.spanContext().traceId;
const rastrosQuebrados = new Set(quebrado.trechos.map((s) => s.spanContext().traceId));

const texto = [
  "Pagamento da cobrança C-2026-11-0412, do aplicativo ao e-mail",
  "",
  "1. Com o traceparent no cabeçalho HTTP, na outbox e na mensagem da fila",
  ...arvore(certo.trechos),
  "",
  `   o log do e-mail tem trace_id ${email(certo.log)}`,
  `   o mesmo do pagamento: ${email(certo.log) === pagamento ? "sim" : "não"}`,
  "",
  "2. Sem a coluna traceparent na outbox",
  `   rastros: ${rastrosQuebrados.size}`,
  ...arvore(quebrado.trechos),
  "",
  `   o log do e-mail tem trace_id ${email(quebrado.log)}`,
  "   quem procura pelo rastro do pagamento não encontra o e-mail",
  "",
];
writeFileSync(join(pasta, "rastro.txt"), texto.join("\n"));
writeFileSync(join(pasta, "trechos.jsonl"), jsonl(certo.trechos) + "\n");
writeFileSync(join(pasta, "logs.jsonl"), certo.log.linhas.join("\n") + "\n");
console.log(texto.join("\n"));
