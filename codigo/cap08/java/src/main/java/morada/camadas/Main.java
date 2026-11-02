// Uso: java morada.camadas.Main <requisicoes.json> <pasta-de-saída>
// Monta as camadas de baixo para cima, sobe a API numa porta livre só desta máquina
// e envia as requisições, gravando cada resposta.
package morada.camadas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import morada.camadas.aplicacao.ServicoDeReservas;
import morada.camadas.apresentacao.Api;
import morada.camadas.dados.RepositorioDeAgendas;
import morada.camadas.dominio.Agenda.Espaco;

public class Main {

    public static void main(String[] args) throws Exception {
        ObjectMapper json = new ObjectMapper();
        JsonNode dados = json.readTree(Path.of(args[0]).toFile());
        List<Espaco> espacos = new ArrayList<>();
        for (JsonNode e : dados.get("espacos")) {
            espacos.add(json.treeToValue(e, Espaco.class));
        }
        var api = Api.criar(new ServicoDeReservas(new RepositorioDeAgendas(espacos)));
        api.start("127.0.0.1", 0);
        String base = "http://127.0.0.1:" + api.port();

        HttpClient cliente = HttpClient.newHttpClient();
        List<String> linhas = new ArrayList<>();
        for (JsonNode r : dados.get("requisicoes")) {
            String metodo = r.get("metodo").asText();
            String caminho = r.get("caminho").asText();
            var corpo = r.has("corpo")
                ? BodyPublishers.ofString(json.writeValueAsString(r.get("corpo")))
                : BodyPublishers.noBody();
            var req = HttpRequest.newBuilder(URI.create(base + caminho))
                .header("Content-Type", "application/json")
                .method(metodo, corpo)
                .build();
            var resposta = cliente.send(req, BodyHandlers.ofString());
            String compacto = json.writeValueAsString(json.readTree(resposta.body()));
            linhas.add(
                metodo + " " + caminho + " -> " + resposta.statusCode() + " " + compacto
            );
        }
        api.stop();

        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("respostas.txt"),
            String.join("\n", linhas) + "\n"
        );
        System.out.println(linhas.size() + " requisições; saída em " + saida);
    }
}
