// Repositório: um por agregado. Salva a agenda inteira, nunca uma reserva solta.
// Em memória no laboratório; o capítulo 16 guarda as agendas num banco de dados.
package morada.depois.aplicacao;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.depois.dominio.Agenda;
import morada.depois.dominio.Agenda.PoliticaDeUso;
import morada.depois.dominio.ErroDeDominio;

public class AgendasEmMemoria {

    private final Map<String, Agenda> agendas = new LinkedHashMap<>();

    public AgendasEmMemoria(Map<String, PoliticaDeUso> politicas) {
        politicas.forEach((espaco, politica) ->
            agendas.put(espaco, new Agenda(espaco, politica))
        );
    }

    public Agenda doEspaco(String espaco) {
        Agenda agenda = agendas.get(espaco);
        if (agenda == null) throw new ErroDeDominio("espaço desconhecido: " + espaco);
        return agenda;
    }

    public Agenda daReserva(String reserva) {
        return agendas
            .values()
            .stream()
            .filter(a -> a.tem(reserva))
            .findFirst()
            .orElseThrow(() -> new ErroDeDominio("reserva não encontrada"));
    }

    public void salvar(Agenda agenda) {
        agendas.put(agenda.espaco(), agenda);
    }

    public List<Agenda> todas() {
        return List.copyOf(agendas.values());
    }
}
