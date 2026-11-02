// Camada de apresentação: traduz HTTP em chamadas à aplicação e erros em
// códigos de status. É a única camada que conhece o Javalin.
package morada.camadas.apresentacao;

import io.javalin.Javalin;
import java.util.Map;
import morada.camadas.aplicacao.ServicoDeReservas;
import morada.camadas.aplicacao.ServicoDeReservas.PedidoDeReserva;
import morada.camadas.dominio.Erros.NaoEncontradoErro;
import morada.camadas.dominio.Erros.RegraVioladaErro;

public class Api {

    static class DadosInvalidosErro extends RuntimeException {

        DadosInvalidosErro(String mensagem) {
            super(mensagem);
        }
    }

    static void validar(PedidoDeReserva p) {
        Map<String, Object> campos = new java.util.LinkedHashMap<>();
        campos.put("reserva", p.reserva());
        campos.put("unidade", p.unidade());
        campos.put("espaco", p.espaco());
        campos.put("data", p.data());
        campos.put("inicio", p.inicio());
        campos.put("fim", p.fim());
        campos.put("em", p.em());
        campos.forEach((campo, valor) -> {
            if (valor == null) throw new DadosInvalidosErro(
                "campo obrigatório: " + campo
            );
        });
    }

    public static Javalin criar(ServicoDeReservas servico) {
        Javalin app = Javalin.create(config -> config.showJavalinBanner = false);

        app.get("/espacos", ctx -> ctx.json(servico.listarEspacos()));

        app.post("/reservas", ctx -> {
            PedidoDeReserva pedido = ctx.bodyAsClass(PedidoDeReserva.class);
            validar(pedido);
            ctx.status(201).json(servico.reservar(pedido));
        });

        app.delete("/reservas/{id}", ctx ->
            ctx.json(servico.cancelar(ctx.pathParam("id"), ctx.queryParam("em")))
        );

        app.get("/espacos/{id}/reservas", ctx ->
            ctx.json(servico.reservasDoEspaco(ctx.pathParam("id")))
        );

        // Cada tipo de erro vira um código de status; o domínio não sabe disso
        app.exception(DadosInvalidosErro.class, (e, ctx) ->
            ctx.status(400).json(Map.of("erro", e.getMessage()))
        );
        app.exception(NaoEncontradoErro.class, (e, ctx) ->
            ctx.status(404).json(Map.of("erro", e.getMessage()))
        );
        app.exception(RegraVioladaErro.class, (e, ctx) ->
            ctx.status(409).json(Map.of("erro", e.getMessage()))
        );
        return app;
    }
}
