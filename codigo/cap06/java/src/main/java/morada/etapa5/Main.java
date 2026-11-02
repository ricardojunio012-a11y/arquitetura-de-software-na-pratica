// Uso: java morada.etapa5.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O main faz toda a entrada e saída; o módulo de reservas não toca em arquivos.
package morada.etapa5;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

public class Main {

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        var dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            Reservas.Dados.class
        );
        var decisoes = Reservas.decidir(dados, hoje);

        // Aqui entraria o cliente de e-mail de verdade; no laboratório, um arquivo
        List<String> emails = Reservas.avisos(decisoes)
            .stream()
            .map(a -> "para " + a.para() + ": " + a.texto())
            .toList();
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        String relatorio = String.join("\n", Reservas.relatorio(decisoes)) + "\n";
        Files.writeString(saida.resolve("reservas.txt"), relatorio);
        Files.writeString(
            saida.resolve("emails.txt"),
            String.join("\n", emails) + "\n"
        );
    }
}
