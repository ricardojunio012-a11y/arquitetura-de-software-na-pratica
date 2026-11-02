// Observer: quem publica um evento não conhece quem reage a ele.
package morada;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import morada.Tipos.Pedido;

public final class Eventos {

    private Eventos() {}

    // tipo: "ReservaConfirmada" ou "ReservaRecusada"
    public record Evento(String tipo, Pedido pedido, String motivo) {}

    public interface Assinante {
        String nome();

        void tratar(Evento evento);
    }

    public static class Barramento {

        private final Map<String, List<Assinante>> assinantes = new HashMap<>();
        public final List<String> falhas = new ArrayList<>();

        public void assinar(String tipo, Assinante assinante) {
            assinantes.computeIfAbsent(tipo, t -> new ArrayList<>()).add(assinante);
        }

        // Um assinante que falha não impede os outros de receberem o evento
        public void publicar(Evento evento) {
            for (Assinante assinante : assinantes.getOrDefault(
                evento.tipo(),
                List.of()
            )) {
                try {
                    assinante.tratar(evento);
                } catch (RuntimeException erro) {
                    falhas.add(
                        evento.tipo() +
                            " " +
                            evento.pedido().id() +
                            ": " +
                            assinante.nome() +
                            ": " +
                            erro.getMessage()
                    );
                }
            }
        }
    }
}
