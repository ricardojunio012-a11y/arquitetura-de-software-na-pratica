// Camada de domínio: as regras de reserva. Não conhece HTTP, JSON nem banco de dados.
package morada.camadas.dominio;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import morada.camadas.dominio.Erros.NaoEncontradoErro;
import morada.camadas.dominio.Erros.RegraVioladaErro;

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
    private final List<Reserva> reservas = new ArrayList<>();

    public Agenda(Espaco espaco) {
        this.espaco = espaco;
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

    public boolean tem(String id) {
        return reservas.stream().anyMatch(r -> r.id().equals(id));
    }

    public List<Reserva> reservas() {
        return List.copyOf(reservas);
    }
}
