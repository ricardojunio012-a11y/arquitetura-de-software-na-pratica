// Datas recebidas por parâmetro: nada de relógio escondido.
package morada.depois.compartilhado;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class Datas {

    private Datas() {}

    public static long diasEntre(String dataIso, LocalDate hoje) {
        return ChronoUnit.DAYS.between(LocalDate.parse(dataIso), hoje);
    }

    public static String rotuloDoMes(LocalDate hoje) {
        return "%02d/%d".formatted(hoje.getMonthValue(), hoje.getYear());
    }
}
