// Porta de saída: o que o sistema precisa para guardar as agendas.
package morada.aplicacao;

import java.util.List;
import morada.dominio.Agenda;

public interface RepositorioDeAgendas {
    List<Agenda> todas();

    Agenda doEspaco(String espaco);

    Agenda daReserva(String reserva);

    void salvar(Agenda agenda);
}
