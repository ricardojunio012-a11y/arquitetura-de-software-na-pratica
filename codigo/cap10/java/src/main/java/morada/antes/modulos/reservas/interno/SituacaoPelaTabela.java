// Antes: o atalho. Reservas lê a tabela do Financeiro direto e reimplementa a regra
// de inadimplência por conta própria, sem saber que um acordo de parcelamento
// deixa a unidade em dia.
package morada.antes.modulos.reservas.interno;

import morada.antes.modulos.financeiro.interno.TabelaDeCobrancas;
import morada.antes.modulos.reservas.Reservas.SituacaoFinanceira;

public class SituacaoPelaTabela implements SituacaoFinanceira {

    private final TabelaDeCobrancas tabela;

    public SituacaoPelaTabela(TabelaDeCobrancas tabela) {
        this.tabela = tabela;
    }

    public boolean unidadeEmDia(String unidade, String hoje) {
        return tabela.linhas
            .stream()
            .noneMatch(
                l ->
                    l.unidade.equals(unidade) &&
                    !l.situacao.equals("paga") &&
                    l.vencimento.compareTo(hoje) < 0
            );
    }
}
