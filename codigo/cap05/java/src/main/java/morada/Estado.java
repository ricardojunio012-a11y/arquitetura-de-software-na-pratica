// State: o que se pode fazer com uma reserva depende do estado em que ela está.
// Cada estado é um objeto que sabe quais transições aceita; a reserva só repassa.
package morada;

import morada.Tipos.Pedido;

public abstract class Estado {

    public abstract String nome();

    // Por padrão, nenhuma transição é permitida; cada estado libera as suas
    void aprovar(Reserva reserva) {
        recusarTransicao("aprovar");
    }

    void recusar(Reserva reserva) {
        recusarTransicao("recusar");
    }

    void cancelar(Reserva reserva) {
        recusarTransicao("cancelar");
    }

    private void recusarTransicao(String acao) {
        throw new IllegalStateException(
            "não é possível " + acao + " uma reserva " + nome()
        );
    }

    static final class Pendente extends Estado {

        public String nome() {
            return "pendente";
        }

        @Override
        void aprovar(Reserva reserva) {
            reserva.mudarPara(APROVADA);
        }

        @Override
        void recusar(Reserva reserva) {
            reserva.mudarPara(RECUSADA);
        }

        @Override
        void cancelar(Reserva reserva) {
            reserva.mudarPara(CANCELADA);
        }
    }

    static final class Aprovada extends Estado {

        public String nome() {
            return "aprovada";
        }

        @Override
        void cancelar(Reserva reserva) {
            reserva.mudarPara(CANCELADA);
        }
    }

    static final class Recusada extends Estado {

        public String nome() {
            return "recusada";
        }
    }

    static final class Cancelada extends Estado {

        public String nome() {
            return "cancelada";
        }
    }

    // Os estados não guardam dados próprios: uma instância de cada basta
    static final Estado APROVADA = new Aprovada();
    static final Estado RECUSADA = new Recusada();
    static final Estado CANCELADA = new Cancelada();

    public static final class Reserva {

        private final Pedido pedido;
        private Estado estado = new Pendente();

        public Reserva(Pedido pedido) {
            this.pedido = pedido;
        }

        public Pedido pedido() {
            return pedido;
        }

        public String estado() {
            return estado.nome();
        }

        public void aprovar() {
            estado.aprovar(this);
        }

        public void recusar() {
            estado.recusar(this);
        }

        public void cancelar() {
            estado.cancelar(this);
        }

        // Usado só pelos estados
        void mudarPara(Estado novo) {
            estado = novo;
        }
    }
}
