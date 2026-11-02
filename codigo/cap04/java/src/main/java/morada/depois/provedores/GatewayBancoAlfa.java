// Adaptador: traduz a cobrança do Morada para a API do Banco Alfa (boleto).
package morada.depois.provedores;

import static morada.compartilhado.Datas.dataBr;
import static morada.compartilhado.Dinheiro.reaisComPonto;

import morada.depois.cobranca.Cobranca;
import morada.depois.emissao.GatewayDePagamento;
import morada.externos.ClienteBancoAlfa;
import morada.externos.ClienteBancoAlfa.Desconto;
import morada.externos.ClienteBancoAlfa.PedidoDeBoleto;

public class GatewayBancoAlfa implements GatewayDePagamento {

    private final ClienteBancoAlfa cliente;

    public GatewayBancoAlfa(ClienteBancoAlfa cliente) {
        this.cliente = cliente;
    }

    @Override
    public String nome() {
        return "Banco Alfa";
    }

    @Override
    public Registro registrar(Cobranca cobranca, Prazos prazos) {
        Desconto desconto =
            cobranca.desconto() > 0
                ? new Desconto(
                      reaisComPonto(cobranca.desconto()),
                      dataBr(prazos.descontoAte())
                  )
                : null;
        var boleto = cliente.emitirBoleto(
            new PedidoDeBoleto(
                cobranca.morador(),
                reaisComPonto(cobranca.total()),
                dataBr(prazos.vencimento()),
                desconto
            )
        );
        return new Registro(cobranca.unidade(), "boleto " + boleto.nossoNumero());
    }
}
