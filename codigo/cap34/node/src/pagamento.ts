import {
  type Context,
  type Tracer,
  SpanKind,
  SpanStatusCode,
} from "@opentelemetry/api";
import { type Log, dentroDe, em, extrair, injetar } from "./telemetria.ts";

// O pagamento de uma taxa de condomínio, do aplicativo ao e-mail, num relógio simulado.
// Cada serviço só conhece o que chega a ele: cabeçalhos HTTP, a linha da outbox e a
// mensagem da fila. O contexto do rastro viaja nesses três portadores.
export interface Opcoes {
  cobranca: string;
  morador: string;
  traceparentNaOutbox: boolean; // a coluna que o time esqueceu de criar
}

const { CLIENT, SERVER, PRODUCER, CONSUMER, INTERNAL } = SpanKind;

export function pagar(t: Record<string, Tracer>, log: Log, o: Opcoes): void {
  // 1. O aplicativo do morador chama a API e manda o traceparent no cabeçalho
  const app = t.aplicativo.startSpan("POST /v1/pagamentos", {
    kind: CLIENT,
    startTime: em(0),
    attributes: { "http.request.method": "POST" },
  });
  const cabecalhos = injetar(dentroDe(app));

  // 2. A API do Financeiro extrai o contexto e continua o mesmo rastro
  const api = t.financeiro.startSpan(
    "POST /v1/pagamentos",
    {
      kind: SERVER,
      startTime: em(12),
      attributes: { "http.route": "/v1/pagamentos", "morada.cobranca": o.cobranca },
    },
    extrair(cabecalhos),
  );
  const ctxApi = dentroDe(api);
  consulta(t.financeiro, ctxApi, "SELECT morada.cobrancas", 20, 28);

  // 3. O gateway: a primeira tentativa esbarra no tempo limite de 300 ms (capítulo 29)
  const g1 = t.financeiro.startSpan(
    "POST /autorizacoes",
    { kind: CLIENT, startTime: em(30), attributes: { "server.address": "gateway" } },
    ctxApi,
  );
  g1.setStatus({ code: SpanStatusCode.ERROR, message: "tempo limite" });
  log.registrar(
    330,
    "aviso",
    "financeiro",
    g1,
    "gateway sem resposta; nova tentativa",
    {
      cobranca: o.cobranca,
      tentativa: 1,
    },
  );
  g1.end(em(330));
  const g2 = t.financeiro.startSpan(
    "POST /autorizacoes",
    {
      kind: CLIENT,
      startTime: em(370),
      attributes: { "server.address": "gateway", "http.request.resend_count": 1 },
    },
    ctxApi,
  );
  g2.setAttribute("http.response.status_code", 200);
  g2.end(em(418));

  // 4. Na mesma transação: a cobrança fica paga e o evento vai para a outbox
  consulta(t.financeiro, ctxApi, "UPDATE morada.cobrancas", 420, 426);
  consulta(t.financeiro, ctxApi, "INSERT morada.outbox", 426, 431);
  const outbox = {
    evento: "PagamentoConfirmado",
    cobranca: o.cobranca,
    morador: o.morador,
    // sem esta coluna, o contexto do rastro morre aqui
    traceparent: o.traceparentNaOutbox ? injetar(ctxApi).traceparent : "",
  };
  log.registrar(432, "info", "financeiro", api, "pagamento confirmado", {
    cobranca: o.cobranca,
    morador: o.morador,
  });
  api.setAttribute("http.response.status_code", 201);
  api.end(em(440));
  app.end(em(452));

  // 5. O relay lê a outbox a cada segundo e publica na fila
  const ctxOutbox = extrair({ traceparent: outbox.traceparent });
  const pub = t["financeiro-relay"].startSpan(
    "publish pagamentos.confirmados",
    {
      kind: PRODUCER,
      startTime: em(1640),
      attributes: { "messaging.system": "rabbitmq" },
    },
    ctxOutbox,
  );
  const mensagem = { corpo: outbox, cabecalhos: injetar(dentroDe(pub, ctxOutbox)) };
  pub.end(em(1646));

  // 6. A Comunicação consome a mensagem e manda o e-mail
  const proc = t.comunicacao.startSpan(
    "process pagamentos.confirmados",
    {
      kind: CONSUMER,
      startTime: em(2110),
      attributes: { "messaging.system": "rabbitmq" },
    },
    extrair(mensagem.cabecalhos),
  );
  const ctxProc = dentroDe(proc, extrair(mensagem.cabecalhos));
  const montar = t.comunicacao.startSpan(
    "montar aviso",
    { kind: INTERNAL, startTime: em(2115) },
    ctxProc,
  );
  montar.end(em(2130));
  const smtp = t.comunicacao.startSpan(
    "smtp enviar",
    { kind: CLIENT, startTime: em(2135), attributes: { "server.address": "smtp" } },
    ctxProc,
  );
  smtp.end(em(2840));
  // o log leva o identificador do morador, nunca o e-mail (capítulo 37)
  log.registrar(2845, "info", "comunicacao", proc, "e-mail de confirmação enviado", {
    cobranca: o.cobranca,
    morador: o.morador,
  });
  proc.end(em(2850));
}

function consulta(t: Tracer, ctx: Context, nome: string, de: number, ate: number) {
  const s = t.startSpan(
    nome,
    { kind: CLIENT, startTime: em(de), attributes: { "db.system.name": "postgresql" } },
    ctx,
  );
  s.end(em(ate));
  return s;
}
