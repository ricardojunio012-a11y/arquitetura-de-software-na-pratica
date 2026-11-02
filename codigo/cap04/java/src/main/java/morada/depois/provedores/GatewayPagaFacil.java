// Adaptador: traduz a cobrança do Morada para a API do PagaFácil (Pix).
package morada.depois.provedores;

import morada.depois.cobranca.Cobranca;
import morada.depois.emissao.GatewayDePagamento;
import morada.externos.PagaFacilApi;
import morada.externos.PagaFacilApi.CobrancaPix;

public class GatewayPagaFacil implements GatewayDePagamento {

    private final PagaFacilApi api;

    public GatewayPagaFacil(PagaFacilApi api) {
        this.api = api;
    }

    @Override
    public String nome() {
        return "PagaFácil";
    }

    @Override
    public Registro registrar(Cobranca cobranca, Prazos prazos) {
        // txid único por mês e unidade: MORADA202603A101
        String mes = prazos.vencimento().substring(0, 7).replace("-", "");
        boolean temDesconto = cobranca.desconto() > 0;
        var resposta = api.criarCobranca(
            new CobrancaPix(
                "MORADA" + mes + cobranca.unidade().replace("-", ""),
                cobranca.total(),
                prazos.vencimento(),
                temDesconto ? cobranca.desconto() : null,
                temDesconto ? prazos.descontoAte() : null
            )
        );
        return new Registro(cobranca.unidade(), "pix " + resposta.txid());
    }
}
