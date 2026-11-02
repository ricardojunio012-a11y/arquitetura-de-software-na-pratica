// Configuração global: qualquer módulo lê e altera (acoplamento comum).
package morada.antes.config;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;

public final class Config {

    public static int fundoPorcento = 10;
    public static int multaPorcento = 2;
    public static LocalDate hoje = LocalDate.now();
    public static JsonNode dados; // o condomínio inteiro, preenchido pelo main

    private Config() {}
}
