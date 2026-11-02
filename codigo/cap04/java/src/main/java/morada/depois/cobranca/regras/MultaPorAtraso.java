package morada.depois.cobranca.regras;

import java.util.List;
import morada.compartilhado.Dinheiro;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// Multa única sobre o débito em atraso.
public class MultaPorAtraso implements Regra {

    private final long porcento;

    public MultaPorAtraso(long porcento) {
        this.porcento = porcento;
    }

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        var d = unidade.debitoAnterior();
        if (d == null) return List.of();
        long multa = Dinheiro.percentual(d.valorCentavos(), porcento);
        return List.of(new Lancamento("multa", "Multa (" + porcento + "%)", multa));
    }
}
