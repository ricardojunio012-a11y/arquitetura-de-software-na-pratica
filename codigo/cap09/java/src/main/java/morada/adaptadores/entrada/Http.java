// Adaptador de entrada HTTP: traduz requisições em chamadas à porta de entrada e
// erros em códigos de status. Só ele conhece o Javalin.
package morada.adaptadores.entrada;

import io.javalin.Javalin;
import java.util.LinkedHashMap;
import java.util.Map;
import morada.aplicacao.CasosDeUsoDeReservas;
import morada.aplicacao.CasosDeUsoDeReservas.PedidoDeReserva;
import morada.dominio.Erros.NaoEncontradoErro;
import morada.dominio.Erros.RegraVioladaErro;

public class Http {

    static class DadosInvalidosErro extends RuntimeException {

        DadosInvalidosErro(String mensagem) {
            super(mensagem);
        }
    }

    static void validar(PedidoDeReserva p) {
        Map<String, Object> campos = new LinkedHashMap<>();
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

    public static Javalin criarApi(CasosDeUsoDeReservas reservas) {
        Javalin app = Javalin.create(config -> config.showJavalinBanner = false);

        app.get("/espacos", ctx -> ctx.json(reservas.listarEspacos()));

        app.post("/reservas", ctx -> {
            PedidoDeReserva pedido = ctx.bodyAsClass(PedidoDeReserva.class);
            validar(pedido);
            ctx.status(201).json(reservas.reservar(pedido));
        });

        app.delete("/reservas/{id}", ctx ->
            ctx.json(reservas.cancelar(ctx.pathParam("id"), ctx.queryParam("em")))
        );

        app.get("/espacos/{id}/reservas", ctx ->
            ctx.json(reservas.reservasDoEspaco(ctx.pathParam("id")))
        );

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
