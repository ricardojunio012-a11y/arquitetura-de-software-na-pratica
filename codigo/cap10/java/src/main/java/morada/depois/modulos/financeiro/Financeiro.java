// API pública do Financeiro: a única porta que os outros módulos podem usar.
package morada.depois.modulos.financeiro;

import morada.depois.modulos.financeiro.interno.TabelaDeCobrancas;
import morada.depois.modulos.financeiro.interno.TabelaDeCobrancas.LinhaDeCobranca;

public class Financeiro {

    private final TabelaDeCobrancas tabela;

    public Financeiro(TabelaDeCobrancas tabela) {
        this.tabela = tabela;
    }

    public static String reais(long centavos) {
        String inteiro = String.format("%,d", centavos / 100).replace(',', '.');
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }

    public String emitir(
        String cobranca,
        String unidade,
        long valorCentavos,
        String vencimento
    ) {
        tabela.linhas.add(
            new LinhaDeCobranca(cobranca, unidade, valorCentavos, vencimento)
        );
        return unidade + " " + reais(valorCentavos) + " vence " + vencimento;
    }

    public String pagar(String cobranca, String em) {
        tabela.buscar(cobranca).situacao = "paga";
        return "em " + em;
    }

    public String parcelar(String cobranca, int parcelas) {
        var linha = tabela.buscar(cobranca);
        linha.situacao = "parcelada";
        linha.parcelas = parcelas;
        return parcelas + " parcelas";
    }

    // Regra de inadimplência: cobrança parcelada num acordo não é débito
    public boolean unidadeEmDia(String unidade, String hoje) {
        return tabela.linhas
            .stream()
            .noneMatch(
                l ->
                    l.unidade.equals(unidade) &&
                    l.situacao.equals("aberta") &&
                    l.vencimento.compareTo(hoje) < 0
            );
    }
}
