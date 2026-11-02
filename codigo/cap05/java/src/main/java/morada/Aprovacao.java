// Chain of Responsibility: cada etapa verifica uma regra e, se o pedido passar,
// entrega para a próxima. O esqueleto de avaliar() é um Template Method.
package morada;

import java.time.LocalDate;
import morada.Repositorio.RepositorioDeReservas;
import morada.Tipos.Decisao;
import morada.Tipos.Pedido;

public final class Aprovacao {

    private Aprovacao() {}

    public abstract static class Etapa {

        private Etapa proxima;

        // Devolve a próxima etapa, para encadear: a.depois(b).depois(c)
        public Etapa depois(Etapa proxima) {
            this.proxima = proxima;
            return proxima;
        }

        public Decisao avaliar(Pedido pedido) {
            String motivo = verificar(pedido);
            if (motivo != null) return new Decisao(false, motivo);
            return proxima != null ? proxima.avaliar(pedido) : Decisao.aprovar();
        }

        // Cada etapa diz o motivo da recusa, ou null se o pedido passou
        protected abstract String verificar(Pedido pedido);
    }

    public static class UnidadeEmDia extends Etapa {

        protected String verificar(Pedido pedido) {
            return pedido.unidade().emDebito() ? "unidade com débito em aberto" : null;
        }
    }

    public static class AntecedenciaMinima extends Etapa {

        private final LocalDate hoje;

        public AntecedenciaMinima(LocalDate hoje) {
            this.hoje = hoje;
        }

        protected String verificar(Pedido pedido) {
            int minimo = pedido.espaco().antecedenciaMinimaDias();
            if (Tipos.diasEntre(hoje, pedido.data()) >= minimo) return null;
            return "antecedência mínima de " + minimo + " dias";
        }
    }

    public static class EspacoLivre extends Etapa {

        private final RepositorioDeReservas reservas;

        public EspacoLivre(RepositorioDeReservas reservas) {
            this.reservas = reservas;
        }

        protected String verificar(Pedido pedido) {
            boolean ocupado = reservas.ocupado(pedido.espaco().id(), pedido.data());
            return ocupado ? "espaço já reservado nesta data" : null;
        }
    }

    public static class LimitePorMes extends Etapa {

        private final RepositorioDeReservas reservas;

        public LimitePorMes(RepositorioDeReservas reservas) {
            this.reservas = reservas;
        }

        protected String verificar(Pedido pedido) {
            long feitas = reservas.contarNoMes(
                pedido.unidade().id(),
                pedido.espaco().id(),
                pedido.data().substring(0, 7)
            );
            if (feitas < pedido.espaco().limitePorMes()) return null;
            return "limite de reservas do mês atingido";
        }
    }
}
