// Relatório de inadimplência: lê as cobranças, nunca as altera.
package morada.depois.inadimplencia;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import morada.depois.cobranca.Cobranca;
import morada.depois.compartilhado.Datas;
import morada.depois.compartilhado.Dinheiro;

public final class Inadimplencia {

    private Inadimplencia() {}

    public static String relatorio(
        String condominio,
        LocalDate hoje,
        List<Cobranca> cobrancas
    ) {
        // Uma lista nova, ordenada: a recebida continua como estava
        List<Cobranca> devedores = cobrancas
            .stream()
            .filter(c -> c.debito() > 0)
            .sorted(Comparator.comparingLong(Cobranca::debito).reversed())
            .toList();
        List<String> linhas = new ArrayList<>();
        linhas.add("# Inadimplência " + Datas.rotuloDoMes(hoje) + " - " + condominio);
        linhas.add("unidade;morador;dias;debito;multa;juros;atualizado");
        long[] soma = new long[4];
        for (Cobranca c : devedores) {
            long[] valores = {
                c.debito(),
                c.multa(),
                c.juros(),
                c.debito() + c.multa() + c.juros(),
            };
            var campos = new ArrayList<>(
                List.of(c.unidade(), c.morador(), String.valueOf(c.diasDeAtraso()))
            );
            for (int i = 0; i < 4; i++) {
                soma[i] += valores[i];
                campos.add(Dinheiro.reais(valores[i]));
            }
            linhas.add(String.join(";", campos));
        }
        var total = new ArrayList<>(List.of("total", "", ""));
        for (long s : soma) total.add(Dinheiro.reais(s));
        linhas.add(String.join(";", total));
        return String.join("\n", linhas) + "\n";
    }
}
