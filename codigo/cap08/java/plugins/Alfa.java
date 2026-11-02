// Plugin do Banco Alfa: numera os boletos em sequência, com cinco dígitos.
import morada.plugins.PluginDeBanco;

public class Alfa implements PluginDeBanco {

    private int ultimo = 0;

    public String nome() {
        return "alfa";
    }

    public String registrar(Cobranca cobranca) {
        ultimo++;
        return String.format("ALFA-%05d", ultimo);
    }
}
