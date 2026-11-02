package morada.depois.cobranca.regras;

import java.util.List;
import morada.compartilhado.Datas;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// O valor que ficou em aberto no mês anterior.
public class DebitoAnterior implements Regra {

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        var d = unidade.debitoAnterior();
        if (d == null) return List.of();
        String descricao =
            "Débito anterior (venc. " + Datas.diaMes(d.vencimento()) + ")";
        return List.of(new Lancamento("debito", descricao, d.valorCentavos()));
    }
}
