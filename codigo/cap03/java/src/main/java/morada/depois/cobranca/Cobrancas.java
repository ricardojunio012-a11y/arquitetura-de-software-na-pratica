// Interface pública da cobrança: os outros módulos só usam o que está aqui.
package morada.depois.cobranca;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import morada.depois.compartilhado.Datas;
import morada.depois.compartilhado.Dinheiro;

public final class Cobrancas {

    private Cobrancas() {}

    public static List<Cobranca> calcular(
        long despesas,
        List<Unidade> unidades,
        LocalDate hoje
    ) {
        return unidades
            .stream()
            .map(u -> {
                long taxa = Dinheiro.parteDe(despesas, u.fracaoMilionesimos());
                long fundo = Regras.fundoDeReserva(taxa);
                var d = u.debitoAnterior();
                long debito = d == null ? 0 : d.valorCentavos();
                var e =
                    d == null
                        ? new Regras.Encargos(0, 0, 0)
                        : Regras.encargos(debito, d.vencimento(), hoje);
                long total = taxa + fundo + debito + e.multa() + e.juros();
                return new Cobranca(
                    u.id(),
                    u.morador().nome(),
                    taxa,
                    fundo,
                    debito,
                    e.dias(),
                    e.multa(),
                    e.juros(),
                    total
                );
            })
            .toList();
    }

    public static String relatorio(
        String condominio,
        LocalDate hoje,
        List<Cobranca> cobrancas
    ) {
        List<String> linhas = new ArrayList<>();
        linhas.add("# Cobranças " + Datas.rotuloDoMes(hoje) + " - " + condominio);
        linhas.add("unidade;morador;taxa;fundo;debito;multa;juros;total");
        for (Cobranca c : cobrancas) {
            var campos = new ArrayList<>(List.of(c.unidade(), c.morador()));
            Stream.of(c.taxa(), c.fundo(), c.debito(), c.multa(), c.juros(), c.total())
                .map(Dinheiro::reais)
                .forEach(campos::add);
            linhas.add(String.join(";", campos));
        }
        return String.join("\n", linhas) + "\n";
    }
}
