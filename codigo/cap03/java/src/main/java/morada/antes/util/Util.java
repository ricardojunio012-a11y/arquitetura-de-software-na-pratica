// Utilidades diversas: o que não coube em outro lugar (coesão por coincidência).
package morada.antes.util;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import morada.antes.config.Config;

public final class Util {

    private Util() {}

    public static String reais(long c) {
        String inteiro = String.format(Locale.of("pt", "BR"), "%,d", c / 100);
        return inteiro + "," + "%02d".formatted(c % 100);
    }

    // Depende, sem avisar, da data guardada na configuração global
    public static long diasDeAtraso(String vencimento) {
        return ChronoUnit.DAYS.between(LocalDate.parse(vencimento), Config.hoje);
    }

    public static String competencia() {
        return "%02d/%d".formatted(Config.hoje.getMonthValue(), Config.hoje.getYear());
    }
}
