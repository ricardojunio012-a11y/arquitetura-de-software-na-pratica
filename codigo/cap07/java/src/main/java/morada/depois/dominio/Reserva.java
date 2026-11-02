// Entidade: tem identidade (o id) e ciclo de vida. Só muda pelos próprios métodos.
package morada.depois.dominio;

public class Reserva {

    private final String id;
    private final String unidade;
    private final Periodo periodo;
    private final Dinheiro taxa;
    private boolean confirmada = true;

    Reserva(String id, String unidade, Periodo periodo, Dinheiro taxa) {
        this.id = id;
        this.unidade = unidade;
        this.periodo = periodo;
        this.taxa = taxa;
    }

    public String id() {
        return id;
    }

    public String unidade() {
        return unidade;
    }

    public Periodo periodo() {
        return periodo;
    }

    public Dinheiro taxa() {
        return taxa;
    }

    public boolean ativa() {
        return confirmada;
    }

    // Só a agenda (mesmo pacote) cancela: quem está fora não muda a reserva
    void cancelar() {
        if (!confirmada) throw new ErroDeDominio("reserva não está confirmada");
        confirmada = false;
    }
}
