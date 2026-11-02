// Dado privado de Reservas: um espaço, uma reserva por dia (simplificado).
package morada.antes.modulos.reservas.interno;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Agenda {

    private final List<String> espacos;
    private final Map<String, String> ocupacao = new HashMap<>();

    public Agenda(List<String> espacos) {
        this.espacos = espacos;
    }

    public String ocupante(String espaco, String data) {
        if (!espacos.contains(espaco)) {
            throw new IllegalArgumentException("espaço " + espaco + " não existe");
        }
        return ocupacao.get(espaco + " " + data);
    }

    public void registrar(String reserva, String espaco, String data) {
        ocupacao.put(espaco + " " + data, reserva);
    }
}
