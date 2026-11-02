// Classe-broto (sprout class, Feathers): a regra nova nasce fora do código legado,
// numa classe nova, pequena e com testes próprios. O legado só ganha uma chamada.
package morada.etapa6;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

public final class LimitePorMes {

    // Reservas por unidade, por espaço, no mesmo mês
    public static final Map<String, Integer> PADRAO = Map.of(
        "salao",
        1,
        "churrasqueira",
        2
    );

    public record Reserva(String unidade, String espaco, String data) {}

    private final Map<String, Integer> limites;

    public LimitePorMes() {
        this(PADRAO);
    }

    public LimitePorMes(Map<String, Integer> limites) {
        this.limites = limites;
    }

    public boolean atingido(Reserva pedido, List<Reserva> aprovadas) {
        Integer limite = limites.get(pedido.espaco());
        if (limite == null) return false;
        String mes = pedido.data().substring(0, 7);
        long feitas = aprovadas
            .stream()
            .filter(
                r ->
                    r.unidade().equals(pedido.unidade()) &&
                    r.espaco().equals(pedido.espaco()) &&
                    r.data().startsWith(mes)
            )
            .count();
        return feitas >= limite;
    }

    // A porta de entrada para o legado, que trabalha com JSON solto
    public boolean atingido(JsonNode pedido, List<JsonNode> aprovadas) {
        return atingido(de(pedido), aprovadas.stream().map(LimitePorMes::de).toList());
    }

    static Reserva de(JsonNode p) {
        return new Reserva(
            p.get("unidade").asText(),
            p.get("espaco").asText(),
            p.get("data").asText()
        );
    }
}
