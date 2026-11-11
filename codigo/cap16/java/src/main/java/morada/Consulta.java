// A versão "consulta": a consulta de inadimplência sobre 1 milhão de cobranças, sem
// índice, com um índice na coluna errada e com o índice certo, criado pela
// migração 003. Os planos vão para saida/consulta; os tempos, que variam, só para o
// terminal.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

public class Consulta {

    static final List<String> PLANOS = new ArrayList<>();

    // Os nós que leem dados (varreduras de tabela e de índice), do plano em JSON
    static List<String> varreduras(JsonNode no) {
        List<String> filhos = new ArrayList<>();
        for (JsonNode filho : no.path("Plans")) filhos.addAll(varreduras(filho));
        if (!no.has("Relation Name") && !no.has("Index Name")) return filhos;
        String tabela = no.has("Relation Name")
            ? " em " + no.get("Relation Name").asText()
            : "";
        String indice = no.has("Index Name")
            ? " pelo índice " + no.get("Index Name").asText()
            : "";
        long descartadas = no.path("Rows Removed by Filter").asLong(0);
        String linhas =
            no.get("Actual Rows").asLong() +
            " linhas aproveitadas, " +
            descartadas +
            " descartadas";
        List<String> resultado = new ArrayList<>();
        resultado.add(no.get("Node Type").asText() + tabela + indice + ": " + linhas);
        resultado.addAll(filhos);
        return resultado;
    }

    static void planejar(Connection banco, String consulta, String titulo)
        throws Exception {
        try (var sql = banco.createStatement()) {
            var linha = sql.executeQuery("EXPLAIN (ANALYZE, FORMAT JSON) " + consulta);
            linha.next();
            JsonNode plano = new ObjectMapper().readTree(linha.getString(1)).get(0);
            PLANOS.add(PLANOS.size() / 3 + 1 + ". " + titulo);
            for (String l : varreduras(plano.get("Plan"))) PLANOS.add("   " + l);
            PLANOS.add("");
            double tempo = plano.get("Execution Time").asDouble();
            System.out.printf("%s: %.1f ms%n", titulo, tempo);
        }
    }

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        Path pastaMigracoes = dados.resolve("migracoes");
        try (var banco = Banco.conectar(System.getenv("BANCO_URL"))) {
            Banco.recriarEsquema(banco);
            List<String> aplicadas = new ArrayList<>(
                Migracoes.aplicar(banco, pastaMigracoes, 2)
            );
            var sql = banco.createStatement();
            sql.execute(Files.readString(dados.resolve("entrada/cobrancas.sql")));
            sql.execute("ANALYZE cobrancas");
            // Sem paralelismo, o plano fica igual em qualquer máquina e mais fácil de
            // ler
            sql.execute("SET max_parallel_workers_per_gather = 0");
            String consulta = Files.readString(
                dados.resolve("entrada/inadimplencia.sql")
            );

            planejar(banco, consulta, "sem índice");
            sql.execute("CREATE INDEX cobrancas_vencimento ON cobrancas (vencimento)");
            sql.execute("ANALYZE cobrancas");
            planejar(banco, consulta, "índice só no vencimento");
            sql.execute("DROP INDEX cobrancas_vencimento");
            aplicadas.addAll(Migracoes.aplicar(banco, pastaMigracoes));
            sql.execute("ANALYZE cobrancas");
            planejar(banco, consulta, "índice da migração 003");

            List<String> resultado = new ArrayList<>();
            var linhas = sql.executeQuery(consulta);
            while (linhas.next()) {
                resultado.add(
                    "unidade " +
                        linhas.getString("unidade") +
                        ": cobranças em aberto " +
                        linhas.getLong("cobrancas") +
                        ", total " +
                        linhas.getLong("total_centavos") +
                        " centavos"
                );
            }

            Path saida = dados.resolve("saida/consulta");
            Files.createDirectories(saida);
            Files.writeString(saida.resolve("planos.txt"), String.join("\n", PLANOS));
            Files.writeString(
                saida.resolve("resultado.txt"),
                String.join("\n", resultado) + "\n"
            );
            Files.writeString(
                saida.resolve("migracoes.txt"),
                String.join("\n", aplicadas) + "\n"
            );
        }
    }
}
