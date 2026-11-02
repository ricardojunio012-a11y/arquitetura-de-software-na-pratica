package morada.depois.cobranca.regras;

import java.util.List;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// O síndico não paga a taxa condominial (o fundo de reserva continua).
public class IsencaoDoSindico implements Regra {

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        if (!unidade.sindico()) return List.of();
        long taxa = Lancamento.valorDe(lancados, "taxa");
        return List.of(new Lancamento("isencao", "Isenção do síndico", -taxa));
    }
}
