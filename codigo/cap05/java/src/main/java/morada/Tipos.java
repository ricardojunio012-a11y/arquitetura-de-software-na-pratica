// Os dados das reservas e funções pequenas de datas e dinheiro.
package morada;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class Tipos {

    private Tipos() {}

    public record Espaco(
        String id,
        String nome,
        long taxaCentavos,
        int antecedenciaMinimaDias,
        int limitePorMes
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Morador(String nome, String email, String canal, String telefone) {}

    public record Unidade(String id, boolean emDebito, Morador morador) {}

    public record Pedido(String id, Unidade unidade, Espaco espaco, String data) {}

    public record Decisao(boolean aprovada, String motivo) {
        public static Decisao aprovar() {
            return new Decisao(true, null);
        }
    }

    public static long diasEntre(LocalDate hoje, String dataIso) {
        return ChronoUnit.DAYS.between(hoje, LocalDate.parse(dataIso));
    }

    // 2026-03-14 -> 14/03/2026
    public static String dataBr(String dataIso) {
        String[] p = dataIso.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
    }

    public static String reais(long c) {
        return c / 100 + "," + String.format("%02d", c % 100);
    }
}
