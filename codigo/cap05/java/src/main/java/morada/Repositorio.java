// Repository: quem usa as reservas não sabe onde elas ficam guardadas.
package morada;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import morada.Estado.Reserva;
import morada.Tipos.Pedido;

public final class Repositorio {

    private Repositorio() {}

    public interface RepositorioDeReservas {
        void salvar(Reserva reserva);

        // Verifica e grava numa operação só: no banco, uma restrição de unicidade
        boolean salvarSeLivre(Reserva reserva);

        Optional<Reserva> buscar(String id);

        boolean ocupado(String espaco, String data);

        long contarNoMes(String unidade, String espaco, String mes);
    }

    // Em memória para o laboratório; o capítulo 16 troca por um banco de dados.
    // Guarda todas as reservas; as consultas só contam as aprovadas.
    public static class EmMemoria implements RepositorioDeReservas {

        private final List<Reserva> reservas = new ArrayList<>();

        public void salvar(Reserva reserva) {
            reservas.add(reserva);
        }

        public boolean salvarSeLivre(Reserva reserva) {
            Pedido p = reserva.pedido();
            if (ocupado(p.espaco().id(), p.data())) return false;
            salvar(reserva);
            return true;
        }

        public Optional<Reserva> buscar(String id) {
            return reservas
                .stream()
                .filter(r -> r.pedido().id().equals(id))
                .findFirst();
        }

        public boolean ocupado(String espaco, String data) {
            return aprovadas().anyMatch(
                p -> p.espaco().id().equals(espaco) && p.data().equals(data)
            );
        }

        public long contarNoMes(String unidade, String espaco, String mes) {
            return aprovadas()
                .filter(p -> p.unidade().id().equals(unidade))
                .filter(p -> p.espaco().id().equals(espaco) && p.data().startsWith(mes))
                .count();
        }

        private Stream<Pedido> aprovadas() {
            return reservas
                .stream()
                .filter(r -> r.estado().equals("aprovada"))
                .map(Reserva::pedido);
        }
    }
}
