// Reservas assina PagamentoConfirmado: a reserva aguardando pagamento é confirmada.
// O assinante é idempotente, porque o broker entrega "pelo menos uma vez".
package morada.modulos;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import morada.Eventos.PagamentoConfirmado;

public class Reservas {

    public record Reserva(String reserva, String unidade, String espaco, String data) {}

    private final Map<String, Reserva> reservas = new LinkedHashMap<>();
    private final Map<String, String> situacao = new LinkedHashMap<>();
    private final Set<String> processados = new HashSet<>();
    public final List<String> registro = new ArrayList<>();

    public Reservas(List<Reserva> iniciais) {
        for (Reserva r : iniciais) {
            reservas.put(r.reserva(), r);
            situacao.put(r.reserva(), "aguardando pagamento");
        }
    }

    public void aoConfirmarPagamento(PagamentoConfirmado e) {
        if (!processados.add(e.evento())) {
            registro.add("reservas ignorou " + e.evento() + " (repetido)");
            return;
        }
        situacao.put(e.reserva(), "confirmada");
        registro.add(
            "reservas recebeu " + e.evento() + ": " + e.reserva() + " confirmada"
        );
    }

    public List<String> linhas() {
        return reservas
            .values()
            .stream()
            .map(r ->
                String.join(
                    ";",
                    r.reserva(),
                    r.unidade(),
                    r.espaco(),
                    r.data(),
                    situacao.get(r.reserva())
                )
            )
            .toList();
    }
}
