// Regras internas da cobrança. Sem "public": o compilador impede o uso fora do pacote.
package morada.depois.cobranca;

import java.time.LocalDate;
import morada.depois.compartilhado.Datas;
import morada.depois.compartilhado.Dinheiro;

final class Regras {

    private static final long FUNDO_DE_RESERVA = 10; // % sobre a taxa
    private static final long MULTA = 2; // % sobre o débito

    record Encargos(long dias, long multa, long juros) {}

    private Regras() {}

    static long fundoDeReserva(long taxa) {
        return Dinheiro.percentual(taxa, FUNDO_DE_RESERVA);
    }

    static Encargos encargos(long debito, String vencimento, LocalDate hoje) {
        long dias = Datas.diasEntre(vencimento, hoje);
        long juros = (debito * dias + 1500) / 3000; // 1% ao mês, proporcional
        return new Encargos(dias, Dinheiro.percentual(debito, MULTA), juros);
    }
}
