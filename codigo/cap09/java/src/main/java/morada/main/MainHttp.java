// Uso: java morada.main.MainHttp memoria|postgres <pasta-de-saída>
// Sobe o adaptador HTTP numa porta livre, com o repositório escolhido, envia as
// requisições e grava as respostas e o estado final das agendas.
package morada.main;

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
import morada.adaptadores.entrada.Http;

public class MainHttp {

    public static void main(String[] args) throws Exception {
        String repositorio = args[0];
        var montado = Montar.montar(repositorio, true);
        var api = Http.criarApi(montado.servico());
        api.start("127.0.0.1", 0);
        String base = "http://127.0.0.1:" + api.port();

        var json = new ObjectMapper();
        JsonNode dados = json.readTree(
            Path.of("/dados/entrada/requisicoes.json").toFile()
        );
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
        List<String> estado = new ArrayList<>();
        for (var a : montado.agendas().todas()) {
            for (var r : a.reservas()) {
                estado.add(
                    String.join(
                        ";",
                        a.espaco().id(),
                        r.id(),
                        r.unidade(),
                        r.data() + " " + r.inicio() + "h-" + r.fim() + "h"
                    )
                );
            }
        }

        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("respostas.txt"),
            String.join("\n", linhas) + "\n"
        );
        Files.writeString(
            saida.resolve("agendas.txt"),
            String.join("\n", estado) + "\n"
        );
        System.out.println(
            linhas.size() + " requisições (" + repositorio + "); saída em " + saida
        );
    }
}
