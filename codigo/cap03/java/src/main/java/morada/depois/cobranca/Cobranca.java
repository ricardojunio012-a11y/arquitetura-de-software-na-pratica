// Resultado do cálculo de uma unidade, imutável: ninguém altera o que é de outro.
package morada.depois.cobranca;

public record Cobranca(
    String unidade,
    String morador,
    long taxa,
    long fundo,
    long debito,
    long diasDeAtraso,
    long multa,
    long juros,
    long total
) {}
