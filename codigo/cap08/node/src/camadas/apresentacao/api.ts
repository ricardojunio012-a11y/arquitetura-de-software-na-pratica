// Camada de apresentação: traduz HTTP em chamadas à aplicação e erros em
// códigos de status. É a única camada que conhece o Fastify.
import Fastify from "fastify";
import type {
  PedidoDeReserva,
  ServicoDeReservas,
} from "../aplicacao/servico-de-reservas.ts";
import { NaoEncontradoErro, RegraVioladaErro } from "../dominio/dominio.ts";

const OBRIGATORIOS = ["reserva", "unidade", "espaco", "data", "inicio", "fim", "em"];

class DadosInvalidosErro extends Error {}

export function criarApi(servico: ServicoDeReservas) {
  const app = Fastify();

  app.get("/espacos", async () => servico.listarEspacos());

  app.post("/reservas", async (req, resposta) => {
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const faltando = OBRIGATORIOS.find((campo) => corpo[campo] === undefined);
    if (faltando) throw new DadosInvalidosErro(`campo obrigatório: ${faltando}`);
    resposta.code(201);
    return servico.reservar(corpo as unknown as PedidoDeReserva);
  });

  app.delete<{ Params: { id: string }; Querystring: { em: string } }>(
    "/reservas/:id",
    async (req) => servico.cancelar(req.params.id, req.query.em),
  );

  app.get<{ Params: { id: string } }>("/espacos/:id/reservas", async (req) =>
    servico.reservasDoEspaco(req.params.id),
  );

  // Cada tipo de erro vira um código de status; o domínio não sabe disso
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
