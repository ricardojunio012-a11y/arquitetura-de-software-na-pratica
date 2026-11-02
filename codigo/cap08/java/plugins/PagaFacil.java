// Plugin da PagaFácil: gera uma cobrança Pix identificada pela unidade.
import morada.plugins.PluginDeBanco;

public class PagaFacil implements PluginDeBanco {

    public String nome() {
        return "pagafacil";
    }

    public String registrar(Cobranca cobranca) {
        return "PIX-" + cobranca.unidade().replace("-", "");
    }
}
