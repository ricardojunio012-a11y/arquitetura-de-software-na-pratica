// API pública de Reservas. O módulo declara o que precisa saber do Financeiro
// (SituacaoFinanceira) sem depender de como o Financeiro guarda os dados.
package morada.depois.modulos.reservas;

import java.util.List;
import morada.depois.modulos.reservas.interno.Agenda;

public class Reservas {

    public interface SituacaoFinanceira {
        boolean unidadeEmDia(String unidade, String hoje);
    }

    public static class RecusaErro extends RuntimeException {

        public RecusaErro(String mensagem) {
            super(mensagem);
        }
    }

    private final Agenda agenda;
    private final SituacaoFinanceira financeiro;

    public Reservas(List<String> espacos, SituacaoFinanceira financeiro) {
        this.agenda = new Agenda(espacos);
        this.financeiro = financeiro;
    }

    public String reservar(
        String reserva,
        String unidade,
        String espaco,
        String data,
        String em
    ) {
        if (!financeiro.unidadeEmDia(unidade, em)) {
            throw new RecusaErro("unidade " + unidade + " em débito");
        }
        if (agenda.ocupante(espaco, data) != null) {
            throw new RecusaErro(espaco + " já reservado em " + data);
        }
        agenda.registrar(reserva, espaco, data);
        return unidade + " " + espaco + " " + data;
    }
}
