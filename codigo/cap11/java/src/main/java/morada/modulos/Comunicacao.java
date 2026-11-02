// Comunicação assina o mesmo evento e avisa o morador. Não conhece Reservas:
// tudo o que precisa veio dentro do evento.
package morada.modulos;

import static morada.Eventos.reais;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import morada.Eventos.PagamentoConfirmado;

public class Comunicacao {

    private final Set<String> processados = new HashSet<>();
    public final List<String> avisos = new ArrayList<>();
    public final List<String> registro = new ArrayList<>();

    public void aoConfirmarPagamento(PagamentoConfirmado e) {
        if (!processados.add(e.evento())) {
            registro.add("comunicacao ignorou " + e.evento() + " (repetido)");
            return;
        }
        avisos.add(
            e.unidade() +
                ": pagamento " +
                e.pagamento() +
                " de " +
                reais(e.valorCentavos()) +
                " recebido; reserva " +
                e.reserva() +
                " confirmada"
        );
        registro.add("comunicacao recebeu " + e.evento() + ": avisou " + e.unidade());
    }
}
