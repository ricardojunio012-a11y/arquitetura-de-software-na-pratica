// Plugin do Banco Beta: outro formato de número, mesmo contrato.
import morada.plugins.PluginDeBanco;

public class Beta implements PluginDeBanco {

    private int ultimo = 0;

    public String nome() {
        return "beta";
    }

    public String registrar(Cobranca cobranca) {
        ultimo++;
        return String.format("BETA/%04d", ultimo);
    }
}
