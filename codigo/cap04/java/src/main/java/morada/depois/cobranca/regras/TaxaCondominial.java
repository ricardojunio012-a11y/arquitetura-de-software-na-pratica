package morada.depois.cobranca.regras;

import java.util.List;
import morada.compartilhado.Dinheiro;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// A parte da unidade nas despesas do mês, pela fração ideal.
public class TaxaCondominial implements Regra {

    private final long despesasDoMes;

    public TaxaCondominial(long despesasDoMes) {
        this.despesasDoMes = despesasDoMes;
    }

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        long taxa = Dinheiro.parteDe(despesasDoMes, unidade.fracaoMilionesimos());
        return List.of(new Lancamento("taxa", "Taxa condominial", taxa));
    }
}
