// Serviços do financeiro: calcula as cobranças e monta as saídas.
package morada.antes.servicos;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import morada.antes.config.Config;
import morada.antes.relatorios.Relatorios;
import morada.antes.util.Util;

public final class Servicos {

    // Campos públicos e mutáveis: qualquer módulo lê e altera
    public static class Cobranca {

        public JsonNode unidade;
        public long taxa, fundo, debito, multa, juros, total;
    }

    // Lista interna, mas pública: qualquer um pode ler e alterar
    public static final List<Cobranca> cobrancas = new ArrayList<>();

    private Servicos() {}

    public static long jurosDeMora(long valor, String vencimento) {
        return (valor * Util.diasDeAtraso(vencimento) + 1500) / 3000;
    }

    public static void calcularTodas() {
        long despesas = Config.dados
            .get("condominio")
            .get("despesasDoMesCentavos")
            .asLong();
        for (JsonNode u : Config.dados.get("unidades")) {
            Cobranca c = new Cobranca();
            c.unidade = u;
            c.taxa =
                (despesas * u.get("fracaoMilionesimos").asLong() + 500000) / 1000000;
            c.fundo = (c.taxa * Config.fundoPorcento + 50) / 100;
            JsonNode d = u.get("debitoAnterior");
            if (!d.isNull()) {
                c.debito = d.get("valorCentavos").asLong();
                c.multa = (c.debito * Config.multaPorcento + 50) / 100;
                c.juros = jurosDeMora(c.debito, d.get("vencimento").asText());
            }
            c.total = c.taxa + c.fundo + c.debito + c.multa + c.juros;
            cobrancas.add(c);
        }
    }

    // Um parâmetro decide o que o método faz (acoplamento de controle)
    public static String gerarSaida(String tipo) {
        if (!tipo.equals("cobrancas")) return Relatorios.gerarRelatorio(tipo);
        String nome = Config.dados.get("condominio").get("nome").asText();
        List<String> linhas = new ArrayList<>();
        linhas.add("# Cobranças " + Util.competencia() + " - " + nome);
        linhas.add("unidade;morador;taxa;fundo;debito;multa;juros;total");
        for (Cobranca c : cobrancas) {
            var campos = new ArrayList<>(
                List.of(
                    c.unidade.get("id").asText(),
                    c.unidade.get("morador").get("nome").asText()
                )
            );
            Stream.of(c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total)
                .map(Util::reais)
                .forEach(campos::add);
            linhas.add(String.join(";", campos));
        }
        return String.join("\n", linhas) + "\n";
    }
}
