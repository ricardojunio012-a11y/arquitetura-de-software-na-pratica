// Uso: java morada.etapa2.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
package morada.etapa2;

import java.time.LocalDate;

public class Main {

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : null;
        GeradorDeCobranca.gerarCobrancaMensal(args[0], args[1], hoje);
        System.out.println("cobranças geradas em " + args[1]);
    }
}
