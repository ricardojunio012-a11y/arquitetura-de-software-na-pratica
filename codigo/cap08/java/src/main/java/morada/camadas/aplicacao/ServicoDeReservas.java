// Camada de aplicação: os casos de uso. Recebe dados simples, chama o domínio e o
// repositório e devolve dados simples. Não sabe que existe HTTP.
package morada.camadas.aplicacao;

import static morada.camadas.dominio.Erros.reais;

import java.util.List;
import morada.camadas.dados.RepositorioDeAgendas;

public class ServicoDeReservas {

    public record PedidoDeReserva(
        String reserva,
        String unidade,
        String espaco,
        String data,
        Integer inicio,
        Integer fim,
        String em
    ) {}

    public record EspacoListado(String id, String taxa, int antecedenciaMinimaDias) {}

    public record Confirmacao(String reserva, String situacao, String taxa) {}

    public record Cancelamento(String reserva, String situacao, String multa) {}

    public record ReservaListada(String reserva, String unidade, String periodo) {}

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
        return new Confirmacao(r.id(), "confirmada", reais(r.taxaCentavos()));
    }

    public Cancelamento cancelar(String reserva, String em) {
        long multa = agendas.daReserva(reserva).cancelar(reserva, em);
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
