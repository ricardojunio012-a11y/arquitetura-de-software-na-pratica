// Etapa 2: o código original depois dos três pedidos de mudança
// (desconto por pontualidade, Pix e aviso por WhatsApp), feitos do jeito mais direto.
package morada.etapa2;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class GeradorDeCobranca {

    public static void gerarCobrancaMensal(String entrada, String saida, LocalDate hoje)
        throws IOException {
        if (hoje == null) hoje = LocalDate.now();
        JsonNode dados = new ObjectMapper().readTree(Path.of(entrada).toFile());
        int ano = hoje.getYear();
        String mes = "%02d".formatted(hoje.getMonthValue());
        String competencia = mes + "/" + ano;
        String vencimento = "10/" + mes + "/" + ano;
        String limiteDesconto = "05/" + mes + "/" + ano;
        String nome = dados.get("condominio").get("nome").asText();

        List<String> linhas = new ArrayList<>();
        linhas.add(
            "# Cobranças %s - %s - vencimento %s".formatted(
                competencia,
                nome,
                vencimento
            )
        );
        linhas.add(
            "unidade;morador;taxa;fundo;debito;multa;juros;total;total_ate_05;pagamento"
        );
        StringBuilder emails = new StringBuilder();
        StringBuilder whatsapp = new StringBuilder();

        for (JsonNode u : dados.get("unidades")) {
            // taxa pela fração ideal, arredondada para o centavo mais próximo
            long despesas = dados
                .get("condominio")
                .get("despesasDoMesCentavos")
                .asLong();
            long taxa =
                (despesas * u.get("fracaoMilionesimos").asLong() + 500000) / 1000000;
            long fundo = (taxa * 10 + 50) / 100; // fundo de reserva: 10%
            long debito = 0;
            long multa = 0;
            long juros = 0;
            if (!u.get("debitoAnterior").isNull()) {
                debito = u.get("debitoAnterior").get("valorCentavos").asLong();
                multa = (debito * 2 + 50) / 100; // multa de 2%
                String vencimentoAnterior = u
                    .get("debitoAnterior")
                    .get("vencimento")
                    .asText();
                LocalDate venc = LocalDate.parse(vencimentoAnterior);
                long dias = ChronoUnit.DAYS.between(venc, hoje);
                juros = (debito * dias + 1500) / 3000; // 1% ao mês, proporcional
            }
            long total = taxa + fundo + debito + multa + juros;
            // desconto de 5% sobre a taxa para quem paga até o dia 5 sem débito
            long totalAte05 = 0;
            if (debito == 0) {
                totalAte05 = total - (taxa * 5 + 50) / 100;
            }
            String id = u.get("id").asText();
            String morador = u.get("morador").get("nome").asText();
            String condominio = dados.get("condominio").get("id").asText();
            boolean pix = u.get("meioPagamento").asText().equals("pix");
            String codigo;
            if (pix) {
                codigo = "PIX-%s-%d%s-%s-%d".formatted(condominio, ano, mes, id, total);
            } else {
                codigo = "BOL-%s-%d%s-%s-%d".formatted(condominio, ano, mes, id, total);
            }

            String comDesconto = totalAte05 > 0 ? reais(totalAte05) : "-";
            linhas.add(
                String.join(
                    ";",
                    id,
                    morador,
                    reais(taxa),
                    reais(fundo),
                    reais(debito),
                    reais(multa),
                    reais(juros),
                    reais(total),
                    comDesconto,
                    codigo
                )
            );

            if (u.get("morador").get("canal").asText().equals("whatsapp")) {
                whatsapp.append(
                    "Para: %s\n".formatted(u.get("morador").get("telefone").asText())
                );
                whatsapp.append(
                    "%s: taxa %s da unidade %s: ".formatted(nome, competencia, id)
                );
                whatsapp.append("R$ %s, vence %s.".formatted(reais(total), vencimento));
                if (totalAte05 > 0) {
                    whatsapp.append(
                        " Até %s: R$ %s.".formatted(limiteDesconto, reais(totalAte05))
                    );
                }
                String meio = pix ? "Pix copia e cola" : "Boleto";
                whatsapp.append(" %s: %s\n----\n".formatted(meio, codigo));
            } else {
                emails.append(
                    "Para: %s\n".formatted(u.get("morador").get("email").asText())
                );
                emails.append(
                    "Assunto: Taxa condominial %s - %s - Unidade %s\n\n".formatted(
                        competencia,
                        nome,
                        id
                    )
                );
                emails.append("Olá, %s.\n\n".formatted(morador));
                emails.append(
                    "A taxa condominial de %s da unidade %s ".formatted(competencia, id)
                );
                emails.append("está disponível.\n");
                emails.append("Valor: R$ %s\n".formatted(reais(total)));
                emails.append("Vencimento: %s\n".formatted(vencimento));
                if (totalAte05 > 0) {
                    emails.append(
                        "Pagando até %s, o valor cai para ".formatted(limiteDesconto)
                    );
                    emails.append("R$ %s.\n".formatted(reais(totalAte05)));
                }
                if (debito > 0) {
                    emails.append(
                        "Inclui débito anterior de R$ %s, com multa de ".formatted(
                            reais(debito)
                        )
                    );
                    emails.append(
                        "R$ %s e juros de R$ %s.\n".formatted(
                            reais(multa),
                            reais(juros)
                        )
                    );
                }
                if (pix) {
                    emails.append("Pix copia e cola: %s\n\n".formatted(codigo));
                } else {
                    emails.append("Boleto: %s\n\n".formatted(codigo));
                }
                emails.append("Administração do %s\n----\n".formatted(nome));
            }
        }

        Files.createDirectories(Path.of(saida));
        Files.writeString(
            Path.of(saida, "cobrancas.txt"),
            String.join("\n", linhas) + "\n"
        );
        Files.writeString(Path.of(saida, "emails.txt"), emails.toString());
        Files.writeString(Path.of(saida, "whatsapp.txt"), whatsapp.toString());
    }

    private static String reais(long c) {
        String inteiro = String.format(Locale.of("pt", "BR"), "%,d", c / 100);
        return inteiro + "," + "%02d".formatted(c % 100);
    }
}
