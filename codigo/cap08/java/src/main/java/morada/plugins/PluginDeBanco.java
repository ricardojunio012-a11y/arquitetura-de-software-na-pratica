// O contrato: tudo o que o núcleo sabe sobre um plugin.
package morada.plugins;

public interface PluginDeBanco {
    record Cobranca(String unidade, long valorCentavos, String banco) {}

    String nome();

    String registrar(Cobranca cobranca);
}
