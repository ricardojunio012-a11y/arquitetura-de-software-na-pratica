// Valores em centavos e arredondamento meio para cima. Não depende de nenhum módulo.
package morada.depois.compartilhado;

import java.util.Locale;

public final class Dinheiro {

    private Dinheiro() {}

    public static long parteDe(long centavos, long milionesimos) {
        return (centavos * milionesimos + 500000) / 1000000;
    }

    public static long percentual(long centavos, long porcento) {
        return (centavos * porcento + 50) / 100;
    }

    public static String reais(long c) {
        String inteiro = String.format(Locale.of("pt", "BR"), "%,d", c / 100);
        return inteiro + "," + "%02d".formatted(c % 100);
    }
}
