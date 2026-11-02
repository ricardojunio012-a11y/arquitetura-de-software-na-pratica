// Objeto de valor: imutável, comparado pelo valor e dono das próprias regras.
package morada.depois.dominio;

import java.util.Locale;

public record Dinheiro(long centavos) {
    public static final Dinheiro ZERO = new Dinheiro(0);

    public Dinheiro {
        if (centavos < 0) {
            throw new ErroDeDominio(
                "valor em dinheiro deve ser um número inteiro de centavos"
            );
        }
    }

    public Dinheiro somar(Dinheiro outro) {
        return new Dinheiro(centavos + outro.centavos);
    }

    // Percentual com arredondamento meio para cima, sempre no mesmo lugar
    public Dinheiro percentual(long porcento) {
        return new Dinheiro((centavos * porcento + 50) / 100);
    }

    // R$ 1.234,56
    @Override
    public String toString() {
        String inteiro = String.format(Locale.of("pt", "BR"), "%,d", centavos / 100);
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }
}
