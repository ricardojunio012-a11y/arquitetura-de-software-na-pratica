// Agregado: a agenda de um espaço é a fronteira de consistência. As regras que
// envolvem várias reservas (sobreposição, limite por unidade) só são garantidas
// por quem conhece todas elas. Ninguém de fora altera uma reserva sem passar por aqui.
package morada.depois.dominio;

import java.util.ArrayList;
import java.util.List;
import morada.depois.dominio.EventoDeDominio.ReservaCancelada;
import morada.depois.dominio.EventoDeDominio.ReservaConfirmada;

public class Agenda {

    public record PoliticaDeUso(
        Dinheiro taxa,
        int antecedenciaMinimaDias,
        int limitePorMes
    ) {}

    private static final long ACRESCIMO_FIM_DE_SEMANA_PORCENTO = 20;
    private static final long MULTA_CANCELAMENTO_PORCENTO = 50;
    private static final long PRAZO_CANCELAMENTO_SEM_MULTA_DIAS = 2;

    private final String espaco;
    private final PoliticaDeUso politica;
    private final List<Reserva> reservas = new ArrayList<>();
    private List<EventoDeDominio> eventos = new ArrayList<>();

    public Agenda(String espaco, PoliticaDeUso politica) {
        this.espaco = espaco;
        this.politica = politica;
    }

    public String espaco() {
        return espaco;
    }

    public Reserva reservar(String id, String unidade, Periodo periodo, String hoje) {
        if (periodo.diasDesde(hoje) < politica.antecedenciaMinimaDias()) {
            throw new ErroDeDominio("antecedência mínima não respeitada");
        }
        for (Reserva r : ativas()) {
            if (r.periodo().sobrepoe(periodo)) {
                throw new ErroDeDominio("horário sobreposto a " + r.id());
            }
        }
        long doMes = ativas()
            .stream()
            .filter(r -> r.unidade().equals(unidade))
            .filter(r -> r.periodo().mes().equals(periodo.mes()))
            .count();
        if (doMes >= politica.limitePorMes()) {
            throw new ErroDeDominio("limite mensal da unidade atingido");
        }
        Reserva reserva = new Reserva(id, unidade, periodo, taxaPara(periodo));
        reservas.add(reserva);
        eventos.add(
            new ReservaConfirmada(id, espaco, periodo, unidade, reserva.taxa())
        );
        return reserva;
    }

    public Dinheiro cancelar(String id, String hoje) {
        Reserva reserva = reservas
            .stream()
            .filter(r -> r.id().equals(id))
            .findFirst()
            .orElseThrow(() -> new ErroDeDominio("reserva não encontrada"));
        reserva.cancelar();
        boolean emCimaDaHora =
            reserva.periodo().diasDesde(hoje) < PRAZO_CANCELAMENTO_SEM_MULTA_DIAS;
        Dinheiro multa = emCimaDaHora
            ? reserva.taxa().percentual(MULTA_CANCELAMENTO_PORCENTO)
            : Dinheiro.ZERO;
        eventos.add(new ReservaCancelada(id, multa));
        return multa;
    }

    public boolean tem(String id) {
        return reservas.stream().anyMatch(r -> r.id().equals(id));
    }

    public List<Reserva> ativas() {
        return reservas.stream().filter(Reserva::ativa).toList();
    }

    // Quem salva o agregado recolhe os eventos para publicá-los depois
    public List<EventoDeDominio> recolherEventos() {
        List<EventoDeDominio> recolhidos = eventos;
        eventos = new ArrayList<>();
        return recolhidos;
    }

    private Dinheiro taxaPara(Periodo periodo) {
        Dinheiro taxa = politica.taxa();
        if (!periodo.ehFimDeSemana()) return taxa;
        return taxa.somar(taxa.percentual(ACRESCIMO_FIM_DE_SEMANA_PORCENTO));
    }
}
