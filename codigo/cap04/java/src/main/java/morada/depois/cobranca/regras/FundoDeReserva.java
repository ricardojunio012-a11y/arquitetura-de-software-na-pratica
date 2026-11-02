package morada.depois.cobranca.regras;

import java.util.List;
import morada.compartilhado.Dinheiro;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// Percentual sobre a taxa condominial, para o fundo de reserva.
public class FundoDeReserva implements Regra {

    private final long porcento;

    public FundoDeReserva(long porcento) {
        this.porcento = porcento;
    }

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        long fundo = Dinheiro.percentual(
            Lancamento.valorDe(lancados, "taxa"),
            porcento
        );
        return List.of(
            new Lancamento("fundo", "Fundo de reserva (" + porcento + "%)", fundo)
        );
    }
}
