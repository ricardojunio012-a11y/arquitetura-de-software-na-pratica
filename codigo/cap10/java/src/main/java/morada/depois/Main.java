// Uso: java morada.depois.Main <comandos.json> <pasta-de-saída>
// Monta os módulos e executa os comandos do Financeiro e de Reservas em ordem.
package morada.depois;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import morada.depois.modulos.financeiro.Financeiro;
import morada.depois.modulos.financeiro.interno.TabelaDeCobrancas;
import morada.depois.modulos.reservas.Reservas;
import morada.depois.modulos.reservas.Reservas.RecusaErro;
import morada.depois.modulos.reservas.interno.SituacaoPeloFinanceiro;

public class Main {

    public static void main(String[] args) throws Exception {
        JsonNode dados = new ObjectMapper().readTree(Path.of(args[0]).toFile());
        List<String> espacos = new ArrayList<>();
        dados.get("espacos").forEach(e -> espacos.add(e.asText()));
        var financeiro = new Financeiro(new TabelaDeCobrancas());
        var reservas = new Reservas(espacos, new SituacaoPeloFinanceiro(financeiro));

        List<String> linhas = new ArrayList<>();
        for (JsonNode c : dados.get("comandos")) {
            String[] r = executar(c, financeiro, reservas);
            linhas.add(String.join(";", r[0], c.get("tipo").asText(), r[1], r[2]));
        }
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("resultados.txt"),
            String.join("\n", linhas) + "\n"
        );
        System.out.println(linhas.size() + " comandos executados; saída em " + saida);
    }

    static String texto(JsonNode c, String campo) {
        return c.get(campo).asText();
    }

    static String[] executar(JsonNode c, Financeiro financeiro, Reservas reservas) {
        String cobranca = c.has("cobranca") ? texto(c, "cobranca") : null;
        return switch (texto(c, "tipo")) {
            case "emitir" -> new String[] {
                cobranca,
                "emitida",
                financeiro.emitir(
                    cobranca,
                    texto(c, "unidade"),
                    c.get("valorCentavos").asLong(),
                    texto(c, "vencimento")
                ),
            };
            case "pagar" -> new String[] {
                cobranca,
                "paga",
                financeiro.pagar(cobranca, texto(c, "em")),
            };
            case "parcelar" -> new String[] {
                cobranca,
                "parcelada",
                financeiro.parcelar(cobranca, c.get("parcelas").asInt()),
            };
            default -> reservar(c, reservas);
        };
    }

    static String[] reservar(JsonNode c, Reservas reservas) {
        String reserva = texto(c, "reserva");
        try {
            String detalhe = reservas.reservar(
                reserva,
                texto(c, "unidade"),
                texto(c, "espaco"),
                texto(c, "data"),
                texto(c, "em")
            );
            return new String[] { reserva, "confirmada", detalhe };
        } catch (RecusaErro erro) {
            return new String[] { reserva, "recusada", erro.getMessage() };
        }
    }
}
