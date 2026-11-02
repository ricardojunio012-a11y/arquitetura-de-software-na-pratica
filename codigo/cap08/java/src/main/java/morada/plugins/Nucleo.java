// O núcleo (microkernel): sabe emitir a remessa de cobranças, mas não conhece nenhum
// banco. Cada banco é um plugin que cumpre o contrato PluginDeBanco e é descoberto
// numa pasta de código-fonte, compilado e carregado em tempo de execução.
package morada.plugins;

import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import javax.tools.ToolProvider;
import morada.plugins.PluginDeBanco.Cobranca;

public class Nucleo {

    private final Map<String, PluginDeBanco> plugins = new TreeMap<>();

    public static String reais(long centavos) {
        String inteiro = String.format("%,d", centavos / 100).replace(',', '.');
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }

    public void instalar(Object plugin) {
        if (!(plugin instanceof PluginDeBanco p)) {
            throw new IllegalArgumentException("plugin não cumpre o contrato");
        }
        plugins.put(p.nome(), p);
    }

    // Descoberta: cada arquivo da pasta é um plugin; nenhuma lista fixa no código
    public void carregar(Path pasta) throws Exception {
        List<String> fontes = new ArrayList<>();
        try (var arquivos = Files.list(pasta)) {
            arquivos
                .filter(a -> a.toString().endsWith(".java"))
                .sorted()
                .forEach(a -> fontes.add(a.toString()));
        }
        if (fontes.isEmpty()) return;
        Path classes = Files.createTempDirectory("plugins");
        String classpath = System.getProperty("java.class.path");
        List<String> opcoes = new ArrayList<>(
            List.of("-d", classes.toString(), "-cp", classpath)
        );
        opcoes.addAll(fontes);
        int codigo = ToolProvider.getSystemJavaCompiler().run(
            null,
            null,
            null,
            opcoes.toArray(String[]::new)
        );
        if (codigo != 0) throw new IllegalStateException("plugin não compila");
        var carregador = new URLClassLoader(
            new URL[] { classes.toUri().toURL() },
            Nucleo.class.getClassLoader()
        );
        for (String fonte : fontes) {
            String classe = Path.of(fonte)
                .getFileName()
                .toString()
                .replace(".java", "");
            instalar(
                carregador.loadClass(classe).getDeclaredConstructor().newInstance()
            );
        }
    }

    public List<String> nomes() {
        return List.copyOf(plugins.keySet());
    }

    // Um plugin ausente ou com defeito não derruba a remessa inteira
    public String emitir(Cobranca c) {
        PluginDeBanco plugin = plugins.get(c.banco());
        String resultado;
        if (plugin == null) {
            resultado = "sem plugin para o banco " + c.banco();
        } else {
            try {
                resultado = plugin.registrar(c);
            } catch (RuntimeException erro) {
                resultado =
                    "falha no plugin " + plugin.nome() + ": " + erro.getMessage();
            }
        }
        return (
            c.unidade() +
            ";" +
            reais(c.valorCentavos()) +
            ";" +
            c.banco() +
            ";" +
            resultado
        );
    }
}
