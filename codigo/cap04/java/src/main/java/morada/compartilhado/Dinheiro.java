// Valores em centavos e arredondamento meio para cima.
package morada.compartilhado;

import java.util.Locale;

public final class Dinheiro {

    private static final Locale BR = Locale.of("pt", "BR");

    private Dinheiro() {}

    public static long parteDe(long centavos, long milionesimos) {
        return (centavos * milionesimos + 500000) / 1000000;
    }

    public static long percentual(long centavos, long porcento) {
        return (centavos * porcento + 50) / 100;
    }

    // 1.352,18 (formato brasileiro, com sinal quando negativo)
    public static String reais(long c) {
        long a = Math.abs(c);
        String inteiro = String.format(BR, "%,d", a / 100);
        return (c < 0 ? "-" : "") + inteiro + "," + String.format("%02d", a % 100);
    }

    // 1352.18 (formato pedido pela API do Banco Alfa)
    public static String reaisComPonto(long c) {
        return c / 100 + "." + String.format("%02d", c % 100);
    }
}
