// O relatório de cobranças do mês, para a administradora.
package morada.etapa3;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

public class RelatorioDeCobrancas {

    private final List<String> linhas = new ArrayList<>();

    public RelatorioDeCobrancas(String condominio, Competencia competencia) {
        linhas.add(
            "# Cobranças " +
                competencia.rotulo() +
                " - " +
                condominio +
                " - vencimento " +
                competencia.vencimento()
        );
        linhas.add("unidade;morador;taxa;fundo;debito;multa;juros;total;pagamento");
    }

    public void adicionar(Cobranca c, String codigoDePagamento) {
        Stream<String> valores = Stream.of(
            c.taxa(),
            c.fundo(),
            c.debito(),
            c.multa(),
            c.juros(),
            c.total()
        ).map(Dinheiro::reais);
        List<String> campos = new ArrayList<>(
            List.of(c.unidade().id(), c.unidade().morador().nome())
        );
        valores.forEach(campos::add);
        campos.add(codigoDePagamento);
        linhas.add(String.join(";", campos));
    }

    public void salvar(Path arquivo) throws IOException {
        Files.writeString(arquivo, String.join("\n", linhas) + "\n");
    }
}
