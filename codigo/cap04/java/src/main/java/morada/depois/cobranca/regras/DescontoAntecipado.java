package morada.depois.cobranca.regras;

import java.util.List;
import morada.compartilhado.Datas;
import morada.compartilhado.Dinheiro;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// Desconto sobre a taxa devida para quem pagar até o dia combinado.
// Quem tem débito anterior não tem desconto (a regra do capítulo 1).
public class DescontoAntecipado implements Regra {

    private final long porcento;
    private final String ate;

    public DescontoAntecipado(long porcento, String ate) {
        this.porcento = porcento;
        this.ate = ate;
    }

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        long taxaDevida =
            Lancamento.valorDe(lancados, "taxa") +
            Lancamento.valorDe(lancados, "isencao");
        if (
            taxaDevida <= 0 || Lancamento.valorDe(lancados, "debito") > 0
        ) return List.of();
        String descricao = "Desconto até " + Datas.diaMes(ate) + " (" + porcento + "%)";
        long desconto = Dinheiro.percentual(taxaDevida, porcento);
        return List.of(new Lancamento("desconto", descricao, -desconto, true));
    }
}
