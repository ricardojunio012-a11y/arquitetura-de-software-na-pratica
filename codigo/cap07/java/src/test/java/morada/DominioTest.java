// Testes: o que o modelo anêmico permite e o que o modelo rico impede.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import morada.antes.Modelo;
import morada.depois.dominio.Agenda;
import morada.depois.dominio.Agenda.PoliticaDeUso;
import morada.depois.dominio.Dinheiro;
import morada.depois.dominio.ErroDeDominio;
import morada.depois.dominio.EventoDeDominio.ReservaCancelada;
import morada.depois.dominio.Periodo;
import org.junit.jupiter.api.Test;

class DominioTest {

    static final PoliticaDeUso POLITICA = new PoliticaDeUso(new Dinheiro(15000), 2, 1);

    @Test
    void antesQualquerCodigoPodeGravarUmaReservaSobreposta() {
        for (int[] h : new int[][] { { 14, 22 }, { 20, 23 } }) {
            var r = new Modelo.Reserva();
            r.id = "X-" + h[0];
            r.espaco = "salao";
            r.data = "2026-03-14";
            r.inicio = h[0];
            r.fim = h[1];
            Modelo.reservas.add(r);
        }
        long sobrepostas = Modelo.reservas
            .stream()
            .filter(r -> r.id.startsWith("X-"))
            .count();
        assertEquals(2, sobrepostas); // o estado inválido foi aceito
    }

    @Test
    void depoisAAgendaRecusaUmHorarioSobreposto() {
        var agenda = new Agenda("salao", POLITICA);
        agenda.reservar(
            "R-1",
            "A-101",
            new Periodo("2026-03-14", 14, 22),
            "2026-03-02"
        );
        var erro = assertThrows(ErroDeDominio.class, () ->
            agenda.reservar(
                "R-2",
                "A-202",
                new Periodo("2026-03-14", 20, 23),
                "2026-03-02"
            )
        );
        assertEquals("horário sobreposto a R-1", erro.getMessage());
    }

    @Test
    void depoisNaoExistePeriodoComOFimAntesDoInicio() {
        assertThrows(ErroDeDominio.class, () -> new Periodo("2026-03-14", 18, 16));
    }

    @Test
    void depoisDinheiroArredondaMeioParaCimaEEComparadoPeloValor() {
        assertEquals("R$ 90,01", new Dinheiro(18001).percentual(50).toString());
        assertEquals(new Dinheiro(9000), new Dinheiro(9000));
    }

    @Test
    void depoisCancelarEmCimaDaHoraGeraMultaEEvento() {
        var agenda = new Agenda("salao", POLITICA);
        agenda.reservar(
            "R-1",
            "A-101",
            new Periodo("2026-03-14", 14, 22),
            "2026-03-02"
        );
        agenda.recolherEventos();
        assertEquals("R$ 90,00", agenda.cancelar("R-1", "2026-03-13").toString());
        var eventos = agenda.recolherEventos();
        assertEquals(1, eventos.size());
        assertEquals(ReservaCancelada.class, eventos.get(0).getClass());
        assertThrows(ErroDeDominio.class, () -> agenda.cancelar("R-1", "2026-03-13"));
        var erro = assertThrows(ErroDeDominio.class, () ->
            agenda.cancelar("R-99", "2026-03-13")
        );
        assertEquals("reserva não encontrada", erro.getMessage());
    }
}
