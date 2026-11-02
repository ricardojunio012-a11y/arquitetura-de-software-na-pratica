// O back-end do Morada (o monólito): Portaria cuida das encomendas e dos visitantes;
// Reservas sabe quem são os convidados de cada festa. Nenhum dos dois conhece telas.
package morada;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Backend {

    private Backend() {}

    public static class Encomenda {

        public final String encomenda;
        public final String unidade;
        public String situacao = "na portaria";
        public int versao = 1;
        public String por;
        public String hora;

        public Encomenda(String encomenda, String unidade) {
            this.encomenda = encomenda;
            this.unidade = unidade;
        }
    }

    public record Convidado(String nome, String reserva, String espaco) {}

    public record Visitante(String nome, String reserva, String tablet, String hora) {}

    public static class Portaria {

        public final Map<String, Encomenda> encomendas = new LinkedHashMap<>();
        public final List<Visitante> visitantes = new ArrayList<>();

        public Portaria(List<Encomenda> iniciais) {
            for (Encomenda e : iniciais) encomendas.put(e.encomenda, e);
        }

        // Concorrência otimista: só muda se ninguém mudou desde a versão vista
        public String mudar(
            String id,
            String situacao,
            int versaoVista,
            String tablet,
            String hora
        ) {
            Encomenda e = encomendas.get(id);
            if (e.versao != versaoVista) {
                return (
                    "conflito: " +
                    id +
                    " já " +
                    e.situacao +
                    " pelo tablet " +
                    e.por +
                    " às " +
                    e.hora
                );
            }
            e.situacao = situacao;
            e.versao++;
            e.por = tablet;
            e.hora = hora;
            return "aplicada";
        }

        public String registrarVisitante(
            String nome,
            String reserva,
            String tablet,
            String hora
        ) {
            visitantes.add(new Visitante(nome, reserva, tablet, hora));
            return "aplicada";
        }
    }

    public static class Reservas {

        private final List<Convidado> convidados;

        public Reservas(List<Convidado> convidados) {
            this.convidados = List.copyOf(convidados);
        }

        public List<Convidado> convidados() {
            return convidados;
        }
    }
}
