// Testes: os assinantes são idempotentes e independentes uns dos outros.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import morada.Eventos.Pagamento;
import morada.modulos.Comunicacao;
import morada.modulos.Reservas;
import morada.modulos.Reservas.Reserva;
import org.junit.jupiter.api.Test;

class EventosTest {

    static final Eventos.PagamentoConfirmado EVENTO = Eventos.eventoDe(
        new Pagamento("P-1", "A-1", "R-1", 18000, null)
    );

    @Test
    void confirmamAReservaEAvisamOMorador() {
        var reservas = new Reservas(
            List.of(new Reserva("R-1", "A-1", "salao", "2026-03-14"))
        );
        var comunicacao = new Comunicacao();
        reservas.aoConfirmarPagamento(EVENTO);
        comunicacao.aoConfirmarPagamento(EVENTO);
        assertEquals(List.of("R-1;A-1;salao;2026-03-14;confirmada"), reservas.linhas());
        assertEquals(1, comunicacao.avisos.size());
    }

    @Test
    void ignoramOMesmoEventoEntregueDuasVezes() {
        var comunicacao = new Comunicacao();
        comunicacao.aoConfirmarPagamento(EVENTO);
        comunicacao.aoConfirmarPagamento(EVENTO);
        assertEquals(1, comunicacao.avisos.size());
        assertEquals(
            "comunicacao ignorou E-P-1 (repetido)",
            comunicacao.registro.get(1)
        );
    }
}
