// Datas no formato ISO (AAAA-MM-DD) e "hoje" recebido por parâmetro.
package morada.compartilhado;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class Datas {

    private Datas() {}

    public static long diasEntre(String dataIso, LocalDate hoje) {
        return ChronoUnit.DAYS.between(LocalDate.parse(dataIso), hoje);
    }

    public static String dataDoMes(LocalDate hoje, int dia) {
        return hoje.withDayOfMonth(dia).toString();
    }

    public static String rotuloDoMes(LocalDate hoje) {
        return String.format("%02d/%d", hoje.getMonthValue(), hoje.getYear());
    }

    // 2026-03-10 -> 10/03
    public static String diaMes(String dataIso) {
        return dataIso.substring(8, 10) + "/" + dataIso.substring(5, 7);
    }

    // 2026-03-10 -> 10/03/2026
    public static String dataBr(String dataIso) {
        return diaMes(dataIso) + "/" + dataIso.substring(0, 4);
    }
}
