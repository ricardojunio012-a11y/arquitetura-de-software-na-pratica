import { describe, expect, it } from "vitest";
import { trace } from "@opentelemetry/api";
import { pagar } from "../src/pagamento.ts";
import {
  ExportadorEmMemoria,
  IdsComSemente,
  Log,
  extrair,
  injetar,
  tracers,
} from "../src/telemetria.ts";

const SERVICOS = ["aplicativo", "financeiro", "financeiro-relay", "comunicacao"];

function rodar(traceparentNaOutbox: boolean) {
  const exportador = new ExportadorEmMemoria();
  const log = new Log();
  const t = tracers(SERVICOS, exportador, new IdsComSemente(1));
  pagar(t, log, { cobranca: "C-1", morador: "M-1", traceparentNaOutbox });
  return { trechos: exportador.trechos, log };
}

describe("propagação do contexto", () => {
  it("o traceparent leva o rastro e o trecho de um lado ao outro", () => {
    const t = tracers(["a"], new ExportadorEmMemoria(), new IdsComSemente(2)).a;
    const s = t.startSpan("x");
    const portador = injetar(trace.setSpan(extrair({}), s));
    expect(portador.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    const recebido = trace.getSpanContext(extrair(portador));
    expect(recebido?.traceId).toBe(s.spanContext().traceId);
    expect(recebido?.spanId).toBe(s.spanContext().spanId);
  });

  it("com o traceparent na outbox, o pagamento e o e-mail ficam num rastro só", () => {
    const { trechos, log } = rodar(true);
    const rastros = new Set(trechos.map((s) => s.spanContext().traceId));
    expect(trechos).toHaveLength(11);
    expect(rastros.size).toBe(1);
    for (const linha of log.linhas)
      expect(rastros.has(JSON.parse(linha).trace_id)).toBe(true);
  });

  it("sem ele, o rastro se parte em dois na outbox", () => {
    const { trechos } = rodar(false);
    expect(new Set(trechos.map((s) => s.spanContext().traceId)).size).toBe(2);
  });

  it("os logs não levam o e-mail do morador", () => {
    const { log } = rodar(true);
    expect(log.linhas.join("\n")).not.toMatch(/@/);
  });
});
