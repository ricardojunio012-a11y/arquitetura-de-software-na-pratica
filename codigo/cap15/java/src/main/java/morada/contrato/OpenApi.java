// Leitura do contrato OpenAPI: resolve referências e encontra a operação de um
// pedido.
package morada.contrato;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import java.io.File;
import java.io.IOException;
import java.util.Iterator;

public final class OpenApi {

    private OpenApi() {}

    public static JsonNode ler(String arquivo) throws IOException {
        return new YAMLMapper().readTree(new File(arquivo));
    }

    // Troca {"$ref": "#/components/schemas/X"} pelo nó apontado
    public static JsonNode resolver(JsonNode contrato, JsonNode no) {
        while (no != null && no.has("$ref")) {
            no = contrato.at(no.get("$ref").asText().substring(1));
        }
        return no;
    }

    // O modelo de caminho do contrato que casa com um caminho concreto
    public static String encontrarCaminho(JsonNode contrato, String caminho) {
        String[] partes = caminho.split("/", -1);
        Iterator<String> modelos = contrato.get("paths").fieldNames();
        while (modelos.hasNext()) {
            String modelo = modelos.next();
            String[] pedacos = modelo.split("/", -1);
            if (pedacos.length != partes.length) continue;
            boolean casa = true;
            for (int i = 0; i < pedacos.length; i++) {
                casa =
                    casa &&
                    (pedacos[i].startsWith("{") || pedacos[i].equals(partes[i]));
            }
            if (casa) return modelo;
        }
        return null;
    }
}
