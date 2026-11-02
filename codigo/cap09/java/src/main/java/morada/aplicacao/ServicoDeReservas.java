// Os casos de uso implementam a porta de entrada e usam a porta de saída. Não sabem
// se foram chamados por HTTP ou pelo terminal, nem onde as agendas são guardadas.
package morada.aplicacao;

import static morada.dominio.Erros.reais;

import java.util.List;

public class ServicoDeReservas implements CasosDeUsoDeReservas {

    private final RepositorioDeAgendas agendas;

    public ServicoDeReservas(RepositorioDeAgendas agendas) {
        this.agendas = agendas;
    }

    public List<EspacoListado> listarEspacos() {
        return agendas
            .todas()
            .stream()
            .map(a -> a.espaco())
            .map(e ->
                new EspacoListado(
                    e.id(),
                    reais(e.taxaCentavos()),
                    e.antecedenciaMinimaDias()
                )
            )
            .toList();
    }

    public Confirmacao reservar(PedidoDeReserva p) {
        var agenda = agendas.doEspaco(p.espaco());
        var r = agenda.reservar(
            p.reserva(),
            p.unidade(),
            p.data(),
            p.inicio(),
            p.fim(),
            p.em()
        );
        agendas.salvar(agenda);
        return new Confirmacao(r.id(), "confirmada", reais(r.taxaCentavos()));
    }

    public Cancelamento cancelar(String reserva, String em) {
        var agenda = agendas.daReserva(reserva);
        long multa = agenda.cancelar(reserva, em);
        agendas.salvar(agenda);
        return new Cancelamento(reserva, "cancelada", reais(multa));
    }

    public List<ReservaListada> reservasDoEspaco(String espaco) {
        return agendas
            .doEspaco(espaco)
            .reservas()
            .stream()
            .map(r ->
                new ReservaListada(
                    r.id(),
                    r.unidade(),
                    r.data() + " " + r.inicio() + "h-" + r.fim() + "h"
                )
            )
            .toList();
    }
}
