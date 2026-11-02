// O centro do hexágono: as regras de reserva. Não importa nada de fora do domínio.
package morada.dominio;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import morada.dominio.Erros.NaoEncontradoErro;
import morada.dominio.Erros.RegraVioladaErro;

public class Agenda {

    public record Espaco(String id, long taxaCentavos, int antecedenciaMinimaDias) {}

    public record Reserva(
        String id,
        String unidade,
        String data,
        int inicio,
        int fim,
        long taxaCentavos
    ) {}

    private final Espaco espaco;
    private final List<Reserva> reservas;

    public Agenda(Espaco espaco) {
        this(espaco, List.of());
    }

    // Um repositório que carrega uma agenda salva passa as reservas existentes
    public Agenda(Espaco espaco, List<Reserva> reservas) {
        this.espaco = espaco;
        this.reservas = new ArrayList<>(reservas);
    }

    public Espaco espaco() {
        return espaco;
    }

    static long dias(String de, String ate) {
        return ChronoUnit.DAYS.between(LocalDate.parse(de), LocalDate.parse(ate));
    }

    public Reserva reservar(
        String id,
        String unidade,
        String data,
        int inicio,
        int fim,
        String hoje
    ) {
        if (fim <= inicio) throw new RegraVioladaErro("período inválido");
        if (dias(hoje, data) < espaco.antecedenciaMinimaDias()) {
            throw new RegraVioladaErro("antecedência mínima não respeitada");
        }
        for (Reserva r : reservas) {
            if (r.data().equals(data) && r.inicio() < fim && inicio < r.fim()) {
                throw new RegraVioladaErro("horário sobreposto a " + r.id());
            }
        }
        long base = espaco.taxaCentavos();
        DayOfWeek dia = LocalDate.parse(data).getDayOfWeek();
        boolean fimDeSemana = dia == DayOfWeek.SATURDAY || dia == DayOfWeek.SUNDAY;
        long taxa = fimDeSemana ? base + (base * 20 + 50) / 100 : base;
        Reserva reserva = new Reserva(id, unidade, data, inicio, fim, taxa);
        reservas.add(reserva);
        return reserva;
    }

    // Devolve a multa em centavos: 50% da taxa se faltar menos de 2 dias
    public long cancelar(String id, String hoje) {
        Reserva r = reservas
            .stream()
            .filter(x -> x.id().equals(id))
            .findFirst()
            .orElseThrow(() -> new NaoEncontradoErro("reserva não encontrada"));
        reservas.remove(r);
        return dias(hoje, r.data()) < 2 ? (r.taxaCentavos() * 50 + 50) / 100 : 0;
    }

    // Em ordem de data e horário, qualquer que seja a ordem em que foram guardadas
    public List<Reserva> reservas() {
        return reservas
            .stream()
            .sorted(Comparator.comparing(Reserva::data).thenComparing(Reserva::inicio))
            .toList();
    }
}
