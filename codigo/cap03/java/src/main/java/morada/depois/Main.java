// Uso: java morada.depois.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os módulos; a ordem dos relatórios não importa mais.
package morada.depois;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.depois.cobranca.Cobranca;
import morada.depois.cobranca.Cobrancas;
import morada.depois.cobranca.Unidade;
import morada.depois.inadimplencia.Inadimplencia;
import morada.depois.prestacao.Prestacao;

public class Main {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Condominio(String nome, long despesasDoMesCentavos) {}

    record Dados(
        Condominio condominio,
        List<Unidade> unidades,
        List<Prestacao.Despesa> despesas,
        long fundoDeReservaSaldoAnteriorCentavos
    ) {}

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        Dados dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            Dados.class
        );
        String nome = dados.condominio().nome();
        List<Cobranca> cobrancas = Cobrancas.calcular(
            dados.condominio().despesasDoMesCentavos(),
            dados.unidades(),
            hoje
        );

        Map<String, String> relatorios = new LinkedHashMap<>();
        relatorios.put("inadimplencia", Inadimplencia.relatorio(nome, hoje, cobrancas));
        relatorios.put("cobrancas", Cobrancas.relatorio(nome, hoje, cobrancas));
        relatorios.put(
            "prestacao",
            Prestacao.deContas(
                nome,
                hoje,
                cobrancas,
                dados.despesas(),
                dados.fundoDeReservaSaldoAnteriorCentavos()
            )
        );
        Path saida = Files.createDirectories(Path.of(args[1]));
        for (var r : relatorios.entrySet()) {
            Files.writeString(saida.resolve(r.getKey() + ".txt"), r.getValue());
        }
        System.out.println("relatórios gerados em " + args[1]);
    }
}
