// A tabela do Financeiro: dado privado do módulo. Nenhum outro módulo deve lê-la.
package morada.antes.modulos.financeiro.interno;

import java.util.ArrayList;
import java.util.List;

public class TabelaDeCobrancas {

    public static class LinhaDeCobranca {

        public final String cobranca;
        public final String unidade;
        public final long valorCentavos;
        public final String vencimento;
        public String situacao = "aberta";
        public int parcelas = 1;

        public LinhaDeCobranca(
            String cobranca,
            String unidade,
            long valorCentavos,
            String vencimento
        ) {
            this.cobranca = cobranca;
            this.unidade = unidade;
            this.valorCentavos = valorCentavos;
            this.vencimento = vencimento;
        }
    }

    public final List<LinhaDeCobranca> linhas = new ArrayList<>();

    public LinhaDeCobranca buscar(String cobranca) {
        return linhas
            .stream()
            .filter(l -> l.cobranca.equals(cobranca))
            .findFirst()
            .orElseThrow(() ->
                new IllegalArgumentException("cobrança não encontrada: " + cobranca)
            );
    }
}
