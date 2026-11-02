// Prestação de contas: recebe só o que precisa, por parâmetro.
package morada.depois.prestacao;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.depois.cobranca.Cobranca;
import morada.depois.compartilhado.Datas;
import morada.depois.compartilhado.Dinheiro;

public final class Prestacao {

    public record Despesa(String categoria, long valorCentavos) {}

    private Prestacao() {}

    public static String deContas(
        String condominio,
        LocalDate hoje,
        List<Cobranca> cobrancas,
        List<Despesa> despesas,
        long saldoAnteriorDoFundo
    ) {
        long taxas = cobrancas.stream().mapToLong(Cobranca::taxa).sum();
        long fundo = cobrancas.stream().mapToLong(Cobranca::fundo).sum();
        List<String> linhas = new ArrayList<>();
        linhas.add(
            "# Prestação de contas " + Datas.rotuloDoMes(hoje) + " - " + condominio
        );
        linhas.add("receitas;taxas condominiais;" + Dinheiro.reais(taxas));
        linhas.add("receitas;fundo de reserva;" + Dinheiro.reais(fundo));
        for (Despesa d : despesas) {
            linhas.add(
                "despesas;" + d.categoria() + ";" + Dinheiro.reais(d.valorCentavos())
            );
        }
        long totalDespesas = despesas.stream().mapToLong(Despesa::valorCentavos).sum();
        linhas.add("despesas;total;" + Dinheiro.reais(totalDespesas));
        linhas.add("fundo;saldo anterior;" + Dinheiro.reais(saldoAnteriorDoFundo));
        linhas.add(
            "fundo;saldo previsto;" + Dinheiro.reais(saldoAnteriorDoFundo + fundo)
        );
        return String.join("\n", linhas) + "\n";
    }
}
