// Uso: java morada.etapa4.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Único lugar que conhece arquivos, relógio e implementações concretas.
package morada.etapa4;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;

public class Main {

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        DadosDoCondominio dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            DadosDoCondominio.class
        );
        Path saida = Files.createDirectories(Path.of(args[1]));

        Map<String, MeioDePagamento> meiosDePagamento = Map.of(
            "boleto",
            new Boleto(),
            "pix",
            new Pix()
        );
        Map<String, Notificador> notificadores = Map.of(
            "email",
            new EmailEmArquivo(saida.resolve("emails.txt")),
            "whatsapp",
            new WhatsAppEmArquivo(saida.resolve("whatsapp.txt"))
        );
        RelatorioDeCobrancas relatorio = Aplicacao.gerarCobrancaMensal(
            dados,
            hoje,
            meiosDePagamento,
            notificadores
        );
        relatorio.salvar(saida.resolve("cobrancas.txt"));
        System.out.println("cobranças geradas em " + args[1]);
    }
}
