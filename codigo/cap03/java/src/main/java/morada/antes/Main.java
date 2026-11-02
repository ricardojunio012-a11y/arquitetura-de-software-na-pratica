// Uso: java morada.antes.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
package morada.antes;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import morada.antes.config.Config;
import morada.antes.servicos.Servicos;

public class Main {

    public static void main(String[] args) throws Exception {
        Config.hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        Config.dados = new ObjectMapper().readTree(Path.of(args[0]).toFile());
        Servicos.calcularTodas();

        // A ordem importa: a inadimplência reordena a lista de cobranças
        Path saida = Files.createDirectories(Path.of(args[1]));
        for (String tipo : List.of("cobrancas", "inadimplencia", "prestacao")) {
            Files.writeString(saida.resolve(tipo + ".txt"), Servicos.gerarSaida(tipo));
        }
        System.out.println("relatórios gerados em " + args[1]);
    }
}
