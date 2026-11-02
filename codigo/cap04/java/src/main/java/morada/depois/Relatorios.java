// Relatórios: só leem cobranças e registros. Uma regra nova aparece aqui sozinha.
package morada.depois;

import static morada.compartilhado.Dinheiro.reais;

import java.util.ArrayList;
import java.util.List;
import morada.compartilhado.Datas;
import morada.depois.cobranca.Cobranca;
import morada.depois.cobranca.Lancamento;
import morada.depois.emissao.GatewayDePagamento.Prazos;
import morada.depois.emissao.GatewayDePagamento.Registro;

public final class Relatorios {

    private Relatorios() {}

    static String linha(String texto, long valor) {
        return String.format("  %-40s%10s", texto, reais(valor));
    }

    public static String cobrancas(
        String titulo,
        List<Cobranca> cobrancas,
        Prazos prazos
    ) {
        List<String> linhas = new ArrayList<>(List.of("# Cobranças " + titulo));
        for (Cobranca c : cobrancas) {
            linhas.add("");
            linhas.add(c.unidade() + " " + c.morador());
            for (Lancamento l : c.lancamentos())
                linhas.add(linha(l.descricao(), l.valor()));
            linhas.add(linha("Total", c.total()));
            if (c.desconto() > 0) {
                String texto =
                    "Total com desconto até " + Datas.diaMes(prazos.descontoAte());
                linhas.add(linha(texto, c.total() - c.desconto()));
            }
        }
        return String.join("\n", linhas) + "\n";
    }

    public static String registros(
        String titulo,
        String gateway,
        List<Cobranca> cobrancas,
        List<Registro> registros
    ) {
        List<String> linhas = new ArrayList<>();
        linhas.add("# Registros " + titulo + " - " + gateway);
        linhas.add("unidade;identificador;valor;desconto");
        for (int i = 0; i < registros.size(); i++) {
            Registro r = registros.get(i);
            Cobranca c = cobrancas.get(i);
            linhas.add(
                r.unidade() +
                    ";" +
                    r.identificador() +
                    ";" +
                    reais(c.total()) +
                    ";" +
                    reais(c.desconto())
            );
        }
        return String.join("\n", linhas) + "\n";
    }
}
