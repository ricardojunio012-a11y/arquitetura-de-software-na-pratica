import {
  type Context,
  type Span,
  type Tracer,
  defaultTextMapGetter,
  defaultTextMapSetter,
  ROOT_CONTEXT,
  trace,
} from "@opentelemetry/api";
import { ExportResultCode, W3CTraceContextPropagator } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  type IdGenerator,
  type ReadableSpan,
  type Sampler,
  type SpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { gerador } from "./aleatorio.ts";

// Identificadores de rastro e de trecho sorteados com semente, para a saída ser igual
// a cada execução. Em produção, o SDK usa o gerador aleatório padrão.
export class IdsComSemente implements IdGenerator {
  #sortear: () => number;
  constructor(semente: number) {
    this.#sortear = gerador(semente);
  }
  #hex(bytes: number): string {
    let s = "";
    for (let i = 0; i < bytes; i++) {
      s += Math.floor(this.#sortear() * 256)
        .toString(16)
        .padStart(2, "0");
    }
    return s;
  }
  generateTraceId(): string {
    return this.#hex(16);
  }
  generateSpanId(): string {
    return this.#hex(8);
  }
}

// Um exportador que guarda os trechos terminados; o rastro.ts grava-os num arquivo
// JSONL. No lugar dele entraria o exportador OTLP, que manda para um coletor.
export class ExportadorEmMemoria implements SpanExporter {
  trechos: ReadableSpan[] = [];
  export(trechos: ReadableSpan[], pronto: (r: { code: number }) => void): void {
    this.trechos.push(...trechos);
    pronto({ code: ExportResultCode.SUCCESS });
  }
  async shutdown(): Promise<void> {}
}

// O relógio simulado: todo instante é "início do teste + ms"
const INICIO = Date.UTC(2026, 10, 5, 12, 0, 0); // 5 de novembro de 2026, 9h em Brasília
export const em = (ms: number): Date => new Date(INICIO + ms);

// Um "Tracer" por serviço: cada um tem o seu service.name, todos exportam para o
// mesmo lugar e sorteiam os identificadores na mesma sequência
export function tracers(
  servicos: string[],
  exportador: SpanExporter,
  ids: IdGenerator,
  amostrador?: Sampler,
): Record<string, Tracer> {
  const r: Record<string, Tracer> = {};
  for (const nome of servicos) {
    const provedor = new BasicTracerProvider({
      resource: resourceFromAttributes({ "service.name": nome }),
      idGenerator: ids,
      sampler: amostrador,
      spanProcessors: [new SimpleSpanProcessor(exportador)],
    });
    r[nome] = provedor.getTracer("morada");
  }
  return r;
}

// Propagação W3C Trace Context: o contexto vira o cabeçalho traceparent e volta
const propagador = new W3CTraceContextPropagator();

export function injetar(ctx: Context): Record<string, string> {
  const portador: Record<string, string> = {};
  propagador.inject(ctx, portador, defaultTextMapSetter);
  return portador;
}

export function extrair(portador: Record<string, string>): Context {
  return propagador.extract(ROOT_CONTEXT, portador, defaultTextMapGetter);
}

export const dentroDe = (span: Span, ctx: Context = ROOT_CONTEXT): Context =>
  trace.setSpan(ctx, span);

// Log estruturado: um objeto JSON por linha, com o rastro e o trecho de onde saiu
export class Log {
  linhas: string[] = [];
  registrar(
    ms: number,
    nivel: "info" | "aviso" | "erro",
    servico: string,
    span: Span,
    msg: string,
    campos: Record<string, string | number> = {},
  ): void {
    const { traceId, spanId } = span.spanContext();
    const ts = em(ms).toISOString();
    const linha = { ts, nivel, servico, msg, ...campos };
    this.linhas.push(JSON.stringify({ ...linha, trace_id: traceId, span_id: spanId }));
  }
}
