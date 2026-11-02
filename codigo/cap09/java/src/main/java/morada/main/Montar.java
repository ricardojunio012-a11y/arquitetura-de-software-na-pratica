// Raiz de composição: o único lugar que escolhe os adaptadores e os liga ao núcleo.
package morada.main;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import morada.adaptadores.saida.AgendasEmMemoria;
import morada.adaptadores.saida.AgendasNoPostgres;
import morada.aplicacao.RepositorioDeAgendas;
import morada.aplicacao.ServicoDeReservas;
import morada.dominio.Agenda.Espaco;

public class Montar {

    public record Montado(ServicoDeReservas servico, RepositorioDeAgendas agendas) {}

    public static Montado montar(String repositorio, boolean preparar)
        throws Exception {
        var json = new ObjectMapper();
        JsonNode dados = json.readTree(Path.of("/dados/entrada/espacos.json").toFile());
        List<Espaco> espacos = new ArrayList<>();
        for (JsonNode e : dados.get("espacos")) {
            espacos.add(json.treeToValue(e, Espaco.class));
        }
        if (repositorio.equals("memoria")) {
            var agendas = new AgendasEmMemoria(espacos);
            return new Montado(new ServicoDeReservas(agendas), agendas);
        }
        var agendas = new AgendasNoPostgres(conectar(), espacos);
        if (preparar) agendas.preparar();
        return new Montado(new ServicoDeReservas(agendas), agendas);
    }

    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    public static java.sql.Connection conectar() throws Exception {
        URI u = URI.create(System.getenv("BANCO_URL"));
        String[] credenciais = u.getUserInfo().split(":");
        String jdbc =
            "jdbc:postgresql://" + u.getHost() + ":" + u.getPort() + u.getPath();
        return DriverManager.getConnection(jdbc, credenciais[0], credenciais[1]);
    }
}
