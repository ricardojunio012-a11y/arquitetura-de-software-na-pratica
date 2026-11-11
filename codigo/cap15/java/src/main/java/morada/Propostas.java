// A versão "compatibilidade": compara cada proposta de entrada/propostas com o
// contrato publicado e diz se ela pode ser publicada sem quebrar os clientes.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import morada.contrato.Compatibilidade;
import morada.contrato.Compatibilidade.Mudanca;
import morada.contrato.OpenApi;

public class Propostas {

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        JsonNode publicado = OpenApi.ler(
            dados.resolve("openapi/publicado/v1.yaml").toString()
        );
        Path pasta = dados.resolve("entrada/propostas");

        List<String> relatorio = new ArrayList<>();
        int incompativeis = 0;
        List<Path> propostas;
        try (var arquivos = Files.list(pasta)) {
            propostas = arquivos.sorted().toList();
        }
        for (Path arquivo : propostas) {
            List<Mudanca> mudancas = Compatibilidade.comparar(
                publicado,
                OpenApi.ler(arquivo.toString())
            );
            boolean quebra = mudancas.stream().anyMatch(m -> !m.compativel());
            if (quebra) incompativeis++;
            String veredito = quebra ? "INCOMPATÍVEL" : "compatível";
            relatorio.add(arquivo.getFileName() + ": " + veredito);
            for (Mudanca m : mudancas) {
                relatorio.add("  " + (m.compativel() ? "+" : "-") + " " + m.texto());
            }
        }
        relatorio.add("");
        relatorio.add(
            "propostas incompatíveis: " + incompativeis + " de " + propostas.size()
        );

        Path saida = dados.resolve("saida/compatibilidade");
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("relatorio.txt"),
            String.join("\n", relatorio) + "\n"
        );
        System.out.println(
            "compatibilidade: " +
                incompativeis +
                " de " +
                propostas.size() +
                " incompatíveis"
        );
    }
}
