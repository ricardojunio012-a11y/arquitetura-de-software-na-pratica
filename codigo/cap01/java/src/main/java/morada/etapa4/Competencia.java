// O mês de referência da cobrança e as datas que dependem dele.
package morada.etapa4;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record Competencia(
    LocalDate hoje,
    String rotulo, // "03/2026"
    String codigo, // "202603"
    String vencimento, // "10/03/2026"
    String limiteDesconto // "05/03/2026"
) {
    public static Competencia de(LocalDate hoje) {
        String mes = String.format("%02d", hoje.getMonthValue());
        int ano = hoje.getYear();
        return new Competencia(
            hoje,
            mes + "/" + ano,
            ano + mes,
            "10/" + mes + "/" + ano,
            "05/" + mes + "/" + ano
        );
    }

    // Dias corridos entre uma data (AAAA-MM-DD) e hoje
    public static long diasDesde(String dataIso, LocalDate hoje) {
        return ChronoUnit.DAYS.between(LocalDate.parse(dataIso), hoje);
    }
}
