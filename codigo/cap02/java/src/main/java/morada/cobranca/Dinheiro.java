// Valores sempre em centavos (inteiros), para não perder precisão.
// Arredondamento: meio centavo para cima.
package morada.cobranca;

import java.util.Locale;

public final class Dinheiro {

    private Dinheiro() {}

    public static long parteDe(long centavos, long milionesimos) {
        return (centavos * milionesimos + 500000) / 1000000;
    }

    public static long percentual(long centavos, long porcento) {
        return (centavos * porcento + 50) / 100;
    }

    // 123456 -> "1.234,56"
    public static String reais(long centavos) {
        return (
            String.format(Locale.of("pt", "BR"), "%,d", centavos / 100) +
            "," +
            String.format("%02d", centavos % 100)
        );
    }
}
