// Verificação do contrato do lado do provedor. Lê o contrato publicado pelo
// consumidor, prepara o estado pedido em cada interação, envia o pedido à API real
// da Comunicação e compara a resposta com a combinada.
package morada.contrato;

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
import java.util.Map;
import java.util.function.Consumer;
import morada.comunicacao.Api;
import morada.comunicacao.Comunicacao;
import morada.comunicacao.Comunicacao.AvisosEmMemoria;

public class Provedor {

    // A resposta cumpre o contrato se tem o status combinado e os campos que o
    // consumidor declarou. Campos a mais não quebram ninguém.
    static boolean cumpre(JsonNode obtido, JsonNode esperado) {
        if (obtido.get("status").asInt() != esperado.get("status").asInt()) {
            return false;
        }
        var campos = esperado.get("corpo").fields();
        while (campos.hasNext()) {
            var campo = campos.next();
            if (!campo.getValue().equals(obtido.get("corpo").get(campo.getKey()))) {
                return false;
            }
        }
        return true;
    }

    public static void main(String[] args) throws Exception {
        var json = new ObjectMapper();
        JsonNode contrato = json.readTree(
            Path.of(args[0], "consumidor", "contrato.json").toFile()
        );
        var cliente = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .build();

        // Cada estado do contrato tem uma preparação do lado do provedor
        Map<String, Consumer<Comunicacao>> estados = Map.of(
            "nenhum aviso foi enviado",
            c -> {},
            "o aviso E-P-001 já foi enviado",
            c -> c.avisar("E-P-001", "pagamento recebido")
        );

        List<String> relatorio = new ArrayList<>();
        for (JsonNode interacao : contrato.get("interacoes")) {
            var comunicacao = new Comunicacao(new AvisosEmMemoria());
            estados.get(interacao.get("estado").asText()).accept(comunicacao);
            var api = Api.criar(comunicacao);
            String url = Api.subir(api);
            JsonNode requisicao = interacao.get("requisicao");
            var pedido = HttpRequest.newBuilder(
                URI.create(url + requisicao.get("caminho").asText())
            )
                .header("Content-Type", "application/json")
                .method(
                    requisicao.get("metodo").asText(),
                    BodyPublishers.ofString(
                        json.writeValueAsString(requisicao.get("corpo"))
                    )
                )
                .build();
            var resposta = cliente.send(pedido, BodyHandlers.ofString());
            api.stop(0);
            var obtido = json.createObjectNode();
            obtido.put("status", resposta.statusCode());
            obtido.set("corpo", json.readTree(resposta.body()));
            String descricao = interacao.get("descricao").asText();
            relatorio.add(
                cumpre(obtido, interacao.get("resposta"))
                    ? descricao + ": verificada"
                    : descricao +
                          ": FALHOU (esperado " +
                          interacao.get("resposta") +
                          ", recebido " +
                          obtido +
                          ")"
            );
        }

        Path pasta = Path.of(args[0], "provedor");
        Files.createDirectories(pasta);
        Files.writeString(
            pasta.resolve("relatorio.txt"),
            String.join("\n", relatorio) + "\n"
        );
        int verificadas = relatorio.size();
        System.out.println("provedor: " + verificadas + " interações verificadas");
        System.exit(relatorio.stream().anyMatch(l -> l.contains("FALHOU")) ? 1 : 0);
    }
}
