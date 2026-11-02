// Camada de dados: onde as agendas ficam guardadas. Hoje, em memória; no capítulo 16,
// num banco de dados. As camadas de cima não percebem a troca.
package morada.camadas.dados;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.camadas.dominio.Agenda;
import morada.camadas.dominio.Agenda.Espaco;
import morada.camadas.dominio.Erros.NaoEncontradoErro;

public class RepositorioDeAgendas {

    private final Map<String, Agenda> agendas = new LinkedHashMap<>();

    public RepositorioDeAgendas(List<Espaco> espacos) {
        for (Espaco e : espacos) agendas.put(e.id(), new Agenda(e));
    }

    public List<Agenda> todas() {
        return List.copyOf(agendas.values());
    }

    public Agenda doEspaco(String id) {
        Agenda agenda = agendas.get(id);
        if (agenda == null) throw new NaoEncontradoErro("espaço não encontrado");
        return agenda;
    }

    public Agenda daReserva(String id) {
        return agendas
            .values()
            .stream()
            .filter(a -> a.tem(id))
            .findFirst()
            .orElseThrow(() -> new NaoEncontradoErro("reserva não encontrada"));
    }
}
