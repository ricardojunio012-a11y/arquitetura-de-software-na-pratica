// Módulo de reservas. Etapa 3: nomes que dizem o que as coisas são e funções
// extraídas (Rename Variable, Extract Function). A estrutura ainda é a original.
package morada.etapa3;

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
        if (ehSabado(pedido.get("data").asText())) valor = valor + (valor * 20) / 100;
        if (pedido.get("convidados").asInt() > 50) valor = valor + 5000;
        return valor;
    }

    static String reais(long centavos) {
        return centavos / 100 + "," + String.format("%02d", centavos % 100);
    }

    static JsonNode buscar(JsonNode lista, String id) {
        JsonNode achado = null;
        for (JsonNode item : lista)
            if (item.get("id").asText().equals(id)) achado = item;
        return achado;
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
            String data = pedido.get("data").asText();
            boolean aprovada = true;
            String motivo = "";
            if (unidade.get("emDebito").asBoolean()) {
                aprovada = false;
                motivo = "débito";
            } else {
                if (diasAte(data, hoje) < 2) {
                    aprovada = false;
                    motivo = "antecedência";
                } else {
                    for (JsonNode reserva : aprovadas) {
                        if (
                            reserva.get("espaco").equals(pedido.get("espaco")) &&
                            reserva.get("data").equals(pedido.get("data"))
                        ) {
                            aprovada = false;
                            motivo = "conflito";
                        }
                    }
                }
            }
            String id = pedido.get("id").asText();
            String inicio = String.join(
                ";",
                id,
                pedido.get("unidade").asText(),
                pedido.get("espaco").asText(),
                data
            );
            String email = unidade.get("email").asText();
            if (aprovada) {
                String valor = reais(valorDaReserva(espaco, pedido));
                aprovadas.add(pedido);
                linhas.add(inicio + ";aprovada;" + valor);
                correio.enviar(
                    email,
                    "Reserva " + id + " confirmada. Valor: R$ " + valor
                );
            } else {
                linhas.add(inicio + ";recusada;" + motivo);
                correio.enviar(email, "Reserva " + id + " recusada (" + motivo + ")");
            }
        }
        Files.createDirectories(Path.of(pasta));
        Files.writeString(
            Path.of(pasta, "reservas.txt"),
            String.join("\n", linhas) + "\n"
        );
        Files.writeString(Path.of(pasta, "emails.txt"), String.join("\n", log) + "\n");
    }

    // Uso: java morada.etapa3.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        processarReservas(args[0], args[1], hoje, smtp);
    }
}
