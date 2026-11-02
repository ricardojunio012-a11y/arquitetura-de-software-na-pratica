// Módulo de reservas. Etapa 4: condicionais e números mágicos (Replace Nested
// Conditional with Guard Clauses, Replace Magic Literal, Replace Loop with Pipeline).
package morada.etapa4;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public class Main {

    static final int ANTECEDENCIA_MINIMA_DIAS = 2;
    static final int ACRESCIMO_SABADO_PORCENTO = 20;
    static final int LIMITE_DE_CONVIDADOS = 50;
    static final long TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

    static List<JsonNode> aprovadas = new ArrayList<>();
    static List<String> log = new ArrayList<>();

    static class Smtp {

        void enviar(String para, String texto) {
            log.add("para " + para + ": " + texto);
        }
    }

    static Smtp smtp = new Smtp();

    static long diasAte(String dataIso, LocalDate hoje) {
        return ChronoUnit.DAYS.between(hoje, LocalDate.parse(dataIso));
    }

    // O comentário original dizia "fim de semana", mas o código só olha o sábado
    static boolean ehSabado(String dataIso) {
        return LocalDate.parse(dataIso).getDayOfWeek() == DayOfWeek.SATURDAY;
    }

    static long valorDaReserva(JsonNode espaco, JsonNode pedido) {
        long valor = espaco.get("taxa").asLong();
        if (ehSabado(pedido.get("data").asText())) {
            valor += (valor * ACRESCIMO_SABADO_PORCENTO) / 100;
        }
        if (pedido.get("convidados").asInt() > LIMITE_DE_CONVIDADOS) {
            valor += TAXA_DE_LIMPEZA_EXTRA;
        }
        return valor;
    }

    static String reais(long centavos) {
        return centavos / 100 + "," + String.format("%02d", centavos % 100);
    }

    static JsonNode buscar(JsonNode lista, String id) {
        for (JsonNode item : lista) if (item.get("id").asText().equals(id)) return item;
        throw new IllegalArgumentException("não encontrado: " + id);
    }

    // Cláusulas de guarda: a primeira regra que falha devolve o motivo
    static String motivoDaRecusa(JsonNode pedido, JsonNode unidade, LocalDate hoje) {
        if (unidade.get("emDebito").asBoolean()) return "débito";
        String data = pedido.get("data").asText();
        if (diasAte(data, hoje) < ANTECEDENCIA_MINIMA_DIAS) return "antecedência";
        boolean ocupado = aprovadas
            .stream()
            .anyMatch(
                r ->
                    r.get("espaco").equals(pedido.get("espaco")) &&
                    r.get("data").asText().equals(data)
            );
        if (ocupado) return "conflito";
        return null;
    }

    public static void processarReservas(
        String arquivo,
        String pasta,
        LocalDate hoje,
        Smtp correio
    ) throws Exception {
        JsonNode dados = new ObjectMapper().readTree(new File(arquivo));
        List<String> linhas = new ArrayList<>();
        for (JsonNode pedido : dados.get("pedidos")) {
            JsonNode unidade = buscar(
                dados.get("unidades"),
                pedido.get("unidade").asText()
            );
            JsonNode espaco = buscar(
                dados.get("espacos"),
                pedido.get("espaco").asText()
            );
            String motivo = motivoDaRecusa(pedido, unidade, hoje);
            String id = pedido.get("id").asText();
            String inicio = String.join(
                ";",
                id,
                pedido.get("unidade").asText(),
                pedido.get("espaco").asText(),
                pedido.get("data").asText()
            );
            String email = unidade.get("email").asText();
            if (motivo != null) {
                linhas.add(inicio + ";recusada;" + motivo);
                correio.enviar(email, "Reserva " + id + " recusada (" + motivo + ")");
                continue;
            }
            String valor = reais(valorDaReserva(espaco, pedido));
            aprovadas.add(pedido);
            linhas.add(inicio + ";aprovada;" + valor);
            correio.enviar(email, "Reserva " + id + " confirmada. Valor: R$ " + valor);
        }
        Files.createDirectories(Path.of(pasta));
        Files.writeString(
            Path.of(pasta, "reservas.txt"),
            String.join("\n", linhas) + "\n"
        );
        Files.writeString(Path.of(pasta, "emails.txt"), String.join("\n", log) + "\n");
    }

    // Uso: java morada.etapa4.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        processarReservas(args[0], args[1], hoje, smtp);
    }
}
