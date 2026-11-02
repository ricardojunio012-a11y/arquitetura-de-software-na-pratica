// O resultado do cálculo de uma unidade, em centavos.
package morada.etapa3;

public record Cobranca(
    Unidade unidade,
    long taxa,
    long fundo,
    long debito,
    long multa,
    long juros,
    long total
) {}
