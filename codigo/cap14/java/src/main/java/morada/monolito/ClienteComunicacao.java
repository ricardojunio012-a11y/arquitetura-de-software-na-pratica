// O cliente que o monólito usa para falar com o serviço de Comunicação: o
// consumidor do contrato. Ele interpreta as respostas que o serviço promete dar.
package morada.monolito;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.Map;

public class ClienteComunicacao {

    public record Resultado(boolean ok, boolean repetido, String erro) {}

    static final ObjectMapper JSON = new ObjectMapper();
    static final HttpClient CLIENTE = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();

    private final String url;

    public ClienteComunicacao(String url) {
        this.url = url;
    }

    public Resultado avisar(String id, String texto) throws Exception {
        var pedido = HttpRequest.newBuilder(URI.create(url + "/avisos"))
            .header("Content-Type", "application/json")
            .POST(
                BodyPublishers.ofString(
                    JSON.writeValueAsString(Map.of("id", id, "texto", texto))
                )
            )
            .build();
        var resposta = CLIENTE.send(pedido, BodyHandlers.ofString());
        JsonNode corpo = JSON.readTree(resposta.body());
        if (resposta.statusCode() == 200) {
            return new Resultado(
                true,
                corpo.get("situacao").asText().equals("repetido"),
                null
            );
        }
        return new Resultado(false, false, corpo.get("erro").asText());
    }
}
