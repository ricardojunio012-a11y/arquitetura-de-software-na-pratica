// Recebe o pedido, consulta a cadeia de aprovação, guarda e anuncia o resultado.
package morada;

import morada.Aprovacao.Etapa;
import morada.Estado.Reserva;
import morada.Eventos.Barramento;
import morada.Eventos.Evento;
import morada.Repositorio.RepositorioDeReservas;
import morada.Tipos.Decisao;
import morada.Tipos.Pedido;

public class ServicoDeReservas {

    private final Etapa aprovacao;
    private final RepositorioDeReservas reservas;
    private final Barramento eventos;

    public ServicoDeReservas(
        Etapa aprovacao,
        RepositorioDeReservas reservas,
        Barramento eventos
    ) {
        this.aprovacao = aprovacao;
        this.reservas = reservas;
        this.eventos = eventos;
    }

    public Decisao solicitar(Pedido pedido) {
        var reserva = new Reserva(pedido);
        Decisao decisao = aprovacao.avaliar(pedido);
        // A cadeia viu o espaço livre, mas outro pedido pode ter gravado depois:
        // a gravação confere de novo, numa operação só (passo 6 do laboratório)
        if (decisao.aprovada() && !reservas.salvarSeLivre(reserva)) {
            decisao = new Decisao(false, "espaço já reservado nesta data");
        }
        if (decisao.aprovada()) {
            reserva.aprovar();
            eventos.publicar(new Evento("ReservaConfirmada", pedido, null));
        } else {
            reserva.recusar();
            reservas.salvar(reserva);
            eventos.publicar(new Evento("ReservaRecusada", pedido, decisao.motivo()));
        }
        return decisao;
    }

    // O estado decide se a reserva pode ser cancelada
    public String cancelar(String id) {
        var reserva = reservas
            .buscar(id)
            .orElseThrow(() ->
                new IllegalStateException("reserva " + id + " não encontrada")
            );
        String antes = reserva.estado();
        reserva.cancelar();
        return antes + " -> " + reserva.estado();
    }
}
