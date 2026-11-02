package morada.depois.cobranca.regras;

import java.time.LocalDate;
import java.util.List;
import morada.compartilhado.Datas;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;

// Juros ao mês, proporcionais aos dias de atraso (mês de 30 dias).
public class JurosPorAtraso implements Regra {

    private final long porcentoAoMes;
    private final LocalDate hoje;

    public JurosPorAtraso(long porcentoAoMes, LocalDate hoje) {
        this.porcentoAoMes = porcentoAoMes;
        this.hoje = hoje;
    }

    @Override
    public List<Lancamento> aplicar(Unidade unidade, List<Lancamento> lancados) {
        var d = unidade.debitoAnterior();
        if (d == null) return List.of();
        long dias = Datas.diasEntre(d.vencimento(), hoje);
        long juros = (d.valorCentavos() * porcentoAoMes * dias + 1500) / 3000;
        return List.of(new Lancamento("juros", "Juros (" + dias + " dias)", juros));
    }
}
