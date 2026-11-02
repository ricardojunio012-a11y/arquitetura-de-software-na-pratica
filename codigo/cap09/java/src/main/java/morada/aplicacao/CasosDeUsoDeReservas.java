// Porta de entrada: o que o sistema oferece, seja quem for que o acione.
package morada.aplicacao;

import java.util.List;

public interface CasosDeUsoDeReservas {
    record PedidoDeReserva(
        String reserva,
        String unidade,
        String espaco,
        String data,
        Integer inicio,
        Integer fim,
        String em
    ) {}

    record EspacoListado(String id, String taxa, int antecedenciaMinimaDias) {}

    record Confirmacao(String reserva, String situacao, String taxa) {}

    record Cancelamento(String reserva, String situacao, String multa) {}

    record ReservaListada(String reserva, String unidade, String periodo) {}

    List<EspacoListado> listarEspacos();

    Confirmacao reservar(PedidoDeReserva pedido);

    Cancelamento cancelar(String reserva, String em);

    List<ReservaListada> reservasDoEspaco(String espaco);
}
