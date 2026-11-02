// Uso: java morada.Main <cenarios.json>
// Roda cada cenário, imprime o relatório e termina com erro se algum falhar.
package morada;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

public class Main {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    static String numero(double n) {
        return String.format(PT_BR, "%,d", Math.round(n));
    }

    static String decimal(double n, int casas) {
        return String.format(PT_BR, "%." + casas + "f", n);
    }

    // 2,25 s | 4 min | 6 h 40 min
    static String duracao(double segundos) {
        if (segundos < 60) return decimal(segundos, 2) + " s";
        long minutos = Math.round(segundos / 60);
        long h = minutos / 60;
        if (h == 0) return minutos + " min";
        return minutos % 60 == 0 ? h + " h" : h + " h " + (minutos % 60) + " min";
    }

    public static void main(String[] args) throws Exception {
        List<Cenarios.Cenario> cenarios = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            new TypeReference<List<Cenarios.Cenario>>() {}
        );
        LocalDate hoje = LocalDate.of(2026, 3, 2);
        int falhas = 0;

        for (var c : cenarios) {
            var r = Cenarios.executar(c, hoje);
            if (!r.passou()) falhas++;
            double vazao = r.cobrancas() / r.segundosCalculo();
            System.out.println(c.id() + ": " + c.descricao());
            System.out.println(
                "  cobranças: " +
                    numero(r.cobrancas()) +
                    "  meta: até " +
                    duracao(c.limiteSegundos())
            );
            System.out.println(
                "  cálculo (medido): " +
                    duracao(r.segundosCalculo()) +
                    ", " +
                    numero(vazao) +
                    " por segundo"
            );
            System.out.println(
                "  registro no banco (estimado, " +
                    c.registrosPorSegundo() +
                    "/s): " +
                    duracao(r.segundosRegistro())
            );
            System.out.println(
                "  avisos: " +
                    decimal(r.bytesAvisos() / 1e6, 1) +
                    " MB, " +
                    numero((double) r.bytesAvisos() / r.cobrancas()) +
                    " bytes por aviso"
            );
            System.out.println("  resultado: " + (r.passou() ? "PASSOU" : "FALHOU"));
        }
        System.out.println(
            cenarios.size() -
                falhas +
                " de " +
                cenarios.size() +
                " cenários dentro da meta."
        );
        System.exit(falhas > 0 ? 1 : 0);
    }
}
