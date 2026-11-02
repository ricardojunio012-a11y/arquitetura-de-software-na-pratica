// Aberta para extensão, fechada para modificação: uma regra nova é uma classe nova,
// entregue pelo construtor. Esta classe não muda.
package morada.depois.cobranca;

import java.util.ArrayList;
import java.util.List;

public class CalculadoraDeCobranca {

    private final List<Regra> regras;

    public CalculadoraDeCobranca(List<Regra> regras) {
        this.regras = List.copyOf(regras);
    }

    public Cobranca calcular(Unidade unidade) {
        List<Lancamento> lancados = new ArrayList<>();
        for (Regra regra : regras) {
            lancados.addAll(regra.aplicar(unidade, List.copyOf(lancados)));
        }
        return new Cobranca(unidade.id(), unidade.morador().nome(), lancados);
    }
}
