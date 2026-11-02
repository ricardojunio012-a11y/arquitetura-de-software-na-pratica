// Regras de cálculo da taxa condominial: não lê arquivo nem envia nada.
package morada.cobranca;

import java.time.LocalDate;

public final class Calculo {

    private static final long FUNDO_DE_RESERVA = 10; // % sobre a taxa
    // % sobre o débito (limite do Código Civil, art. 1.336)
    private static final long MULTA = 2;
    // % sobre a taxa, se não houver débito
    private static final long DESCONTO_PONTUALIDADE = 5;

    private Calculo() {}

    // 1% ao mês, proporcional aos dias de atraso
    public static long jurosDeMora(long centavos, long dias) {
        return (centavos * dias + 1500) / 3000;
    }

    public static Cobranca calcularCobranca(
        long despesasCentavos,
        Unidade unidade,
        LocalDate hoje
    ) {
        long taxa = Dinheiro.parteDe(despesasCentavos, unidade.fracaoMilionesimos());
        long fundo = Dinheiro.percentual(taxa, FUNDO_DE_RESERVA);
        long debito = 0;
        long multa = 0;
        long juros = 0;
        if (unidade.debitoAnterior() != null) {
            debito = unidade.debitoAnterior().valorCentavos();
            multa = Dinheiro.percentual(debito, MULTA);
            juros = jurosDeMora(
                debito,
                Competencia.diasDesde(unidade.debitoAnterior().vencimento(), hoje)
            );
        }
        long total = taxa + fundo + debito + multa + juros;
        Long totalAte05 =
            debito == 0
                ? total - Dinheiro.percentual(taxa, DESCONTO_PONTUALIDADE)
                : null;
        return new Cobranca(
            unidade,
            taxa,
            fundo,
            debito,
            multa,
            juros,
            total,
            totalAte05
        );
    }
}
