// O resultado do cálculo de uma unidade, em centavos.
package morada.etapa4;

public record Cobranca(
    Unidade unidade,
    long taxa,
    long fundo,
    long debito,
    long multa,
    long juros,
    long total,
    // valor com desconto de pontualidade; null se a unidade não tiver direito
    Long totalAte05
) {}
