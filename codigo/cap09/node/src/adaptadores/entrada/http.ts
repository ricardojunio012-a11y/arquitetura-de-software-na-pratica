// Adaptador de entrada HTTP: traduz requisições em chamadas à porta de entrada e
// erros em códigos de status. Só ele conhece o Fastify.
import Fastify from "fastify";
import type { CasosDeUsoDeReservas, PedidoDeReserva } from "../../aplicacao/portas.ts";
import { NaoEncontradoErro, RegraVioladaErro } from "../../dominio/agenda.ts";

const OBRIGATORIOS = ["reserva", "unidade", "espaco", "data", "inicio", "fim", "em"];

class DadosInvalidosErro extends Error {}

export function criarApi(reservas: CasosDeUsoDeReservas) {
  const app = Fastify();

  app.get("/espacos", () => reservas.listarEspacos());

  app.post("/reservas", async (req, resposta) => {
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const faltando = OBRIGATORIOS.find((campo) => corpo[campo] === undefined);
    if (faltando) throw new DadosInvalidosErro(`campo obrigatório: ${faltando}`);
    resposta.code(201);
    return reservas.reservar(corpo as unknown as PedidoDeReserva);
  });

  app.delete<{ Params: { id: string }; Querystring: { em: string } }>(
    "/reservas/:id",
    (req) => reservas.cancelar(req.params.id, req.query.em),
  );

  app.get<{ Params: { id: string } }>("/espacos/:id/reservas", (req) =>
    reservas.reservasDoEspaco(req.params.id),
  );

  app.setErrorHandler((erro, _req, resposta) => {
    const status =
      erro instanceof DadosInvalidosErro
        ? 400
        : erro instanceof NaoEncontradoErro
          ? 404
          : erro instanceof RegraVioladaErro
            ? 409
            : 500;
    resposta.code(status).send({ erro: erro.message });
  });
  return app;
}
