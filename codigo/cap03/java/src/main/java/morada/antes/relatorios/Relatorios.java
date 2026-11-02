// Relatórios do financeiro: inadimplência e prestação de contas.
package morada.antes.relatorios;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import morada.antes.config.Config;
import morada.antes.servicos.Servicos;
import morada.antes.util.Util;

public final class Relatorios {

    private Relatorios() {}

    public static String gerarRelatorio(String tipo) {
        String nome = Config.dados.get("condominio").get("nome").asText();
        List<String> linhas = new ArrayList<>();
        if (tipo.equals("inadimplencia")) {
            // Ordena a lista do outro módulo no lugar (acoplamento de conteúdo)
            Servicos.cobrancas.sort(
                Comparator.comparingLong((Servicos.Cobranca c) -> c.debito).reversed()
            );
            linhas.add("# Inadimplência " + Util.competencia() + " - " + nome);
            linhas.add("unidade;morador;dias;debito;multa;juros;atualizado");
            long[] soma = new long[4];
            for (Servicos.Cobranca c : Servicos.cobrancas) {
                if (c.debito == 0) continue;
                String venc = c.unidade
                    .get("debitoAnterior")
                    .get("vencimento")
                    .asText();
                // recalcula o que já existe
                long juros = Servicos.jurosDeMora(c.debito, venc);
                long[] valores = {
                    c.debito,
                    c.multa,
                    juros,
                    c.debito + c.multa + juros,
                };
                var campos = new ArrayList<>(
                    List.of(
                        c.unidade.get("id").asText(),
                        c.unidade.get("morador").get("nome").asText(),
                        String.valueOf(Util.diasDeAtraso(venc))
                    )
                );
                for (int i = 0; i < 4; i++) {
                    soma[i] += valores[i];
                    campos.add(Util.reais(valores[i]));
                }
                linhas.add(String.join(";", campos));
            }
            var total = new ArrayList<>(List.of("total", "", ""));
            for (long s : soma) total.add(Util.reais(s));
            linhas.add(String.join(";", total));
            return String.join("\n", linhas) + "\n";
        }
        // qualquer outro tipo vira prestação de contas
        long taxas = Servicos.cobrancas
            .stream()
            .mapToLong(c -> c.taxa)
            .sum();
        long fundo = Servicos.cobrancas
            .stream()
            .mapToLong(c -> c.fundo)
            .sum();
        linhas.add("# Prestação de contas " + Util.competencia() + " - " + nome);
        linhas.add("receitas;taxas condominiais;" + Util.reais(taxas));
        linhas.add("receitas;fundo de reserva;" + Util.reais(fundo));
        long totalDespesas = 0;
        for (JsonNode d : Config.dados.get("despesas")) {
            totalDespesas += d.get("valorCentavos").asLong();
            linhas.add(
                "despesas;" +
                    d.get("categoria").asText() +
                    ";" +
                    Util.reais(d.get("valorCentavos").asLong())
            );
        }
        linhas.add("despesas;total;" + Util.reais(totalDespesas));
        long saldo = Config.dados.get("fundoDeReservaSaldoAnteriorCentavos").asLong();
        linhas.add("fundo;saldo anterior;" + Util.reais(saldo));
        linhas.add("fundo;saldo previsto;" + Util.reais(saldo + fundo));
        return String.join("\n", linhas) + "\n";
    }
}
