// Uso: java morada.plugins.Main <cobrancas.json> <pasta-de-plugins> <pasta-de-saída>
package morada.plugins;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import morada.plugins.PluginDeBanco.Cobranca;

public class Main {

    public static void main(String[] args) throws Exception {
        Nucleo nucleo = new Nucleo();
        nucleo.carregar(Path.of(args[1]));

        ObjectMapper json = new ObjectMapper();
        JsonNode cobrancas = json.readTree(Path.of(args[0]).toFile()).get("cobrancas");
        List<String> linhas = new ArrayList<>();
        linhas.add("plugins carregados: " + String.join(", ", nucleo.nomes()));
        for (JsonNode c : cobrancas) {
            linhas.add(nucleo.emitir(json.treeToValue(c, Cobranca.class)));
        }

        Path saida = Path.of(args[2]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("remessa.txt"),
            String.join("\n", linhas) + "\n"
        );
        System.out.println(cobrancas.size() + " cobranças; saída em " + saida);
    }
}
