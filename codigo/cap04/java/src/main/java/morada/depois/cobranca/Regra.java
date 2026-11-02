// Cada regra olha a unidade e o que já foi lançado, e devolve o que acrescenta.
package morada.depois.cobranca;

import java.util.List;

public interface Regra {
    List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados);
}
