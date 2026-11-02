// Modelo anêmico: só dados, todos públicos e alteráveis. Nenhuma regra mora aqui.
package morada.antes;

import java.util.ArrayList;
import java.util.List;

public final class Modelo {

    private Modelo() {}

    public static class Reserva {

        public String id = "";
        public String unidade = "";
        public String espaco = "";
        public String data = "";
        public int inicio;
        public int fim;
        public String situacao = "confirmada";
        public long taxaCentavos;
    }

    // Os dados de todas as reservas, que qualquer parte do sistema pode ler e alterar
    public static final List<Reserva> reservas = new ArrayList<>();
}
