// Depois: Reservas pergunta ao Financeiro pela API pública. A regra de
// inadimplência continua num lugar só, o módulo que é dono dela.
package morada.depois.modulos.reservas.interno;

import morada.depois.modulos.financeiro.Financeiro;
import morada.depois.modulos.reservas.Reservas.SituacaoFinanceira;

public class SituacaoPeloFinanceiro implements SituacaoFinanceira {

    private final Financeiro financeiro;

    public SituacaoPeloFinanceiro(Financeiro financeiro) {
        this.financeiro = financeiro;
    }

    public boolean unidadeEmDia(String unidade, String hoje) {
        return financeiro.unidadeEmDia(unidade, hoje);
    }
}
