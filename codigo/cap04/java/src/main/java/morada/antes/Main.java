// Uso: java morada.antes.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O gateway está fixo no código: a variável GATEWAY não muda nada aqui.
package morada.antes;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

public class Main {

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        var dados = new ObjectMapper().readTree(Path.of(args[0]).toFile());
        String[] saidas = Emissao.emitirCobrancas(dados, hoje);
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(saida.resolve("cobrancas.txt"), saidas[0]);
        Files.writeString(saida.resolve("registros.txt"), saidas[1]);
        System.out.println("cobranças emitidas em " + saida);
    }
}
