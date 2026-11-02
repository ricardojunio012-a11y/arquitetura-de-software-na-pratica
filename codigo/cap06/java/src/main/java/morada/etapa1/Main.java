// Módulo de reservas original, escrito às pressas para a primeira assembleia.
// NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
package morada.etapa1;

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

        void enviar(String para, String txt) {
            log.add("para " + para + ": " + txt);
        }
    }

    static Smtp smtp = new Smtp();

    public static void processarReservas(String arq, String pasta) throws Exception {
        JsonNode d = new ObjectMapper().readTree(new File(arq));
        List<String> out = new ArrayList<>();
        LocalDate hj = LocalDate.now();
        for (JsonNode p : d.get("pedidos")) {
            JsonNode u = null,
                e = null;
            for (JsonNode x : d.get("unidades"))
                if (x.get("id").asText().equals(p.get("unidade").asText())) u = x;
            for (JsonNode x : d.get("espacos"))
                if (x.get("id").asText().equals(p.get("espaco").asText())) e = x;
            boolean ok = true;
            String msg = "";
            if (u.get("emDebito").asBoolean()) {
                ok = false;
                msg = "débito";
            } else {
                long n = ChronoUnit.DAYS.between(
                    hj,
                    LocalDate.parse(p.get("data").asText())
                );
                if (n < 2) {
                    ok = false;
                    msg = "antecedência";
                } else {
                    for (JsonNode a : aprovadas) {
                        if (
                            a.get("espaco").equals(p.get("espaco")) &&
                            a.get("data").equals(p.get("data"))
                        ) {
                            ok = false;
                            msg = "conflito";
                        }
                    }
                }
            }
            String ini =
                p.get("id").asText() +
                ";" +
                p.get("unidade").asText() +
                ";" +
                p.get("espaco").asText() +
                ";" +
                p.get("data").asText();
            if (ok) {
                // calcula o valor
                long v = e.get("taxa").asLong();
                if (
                    LocalDate.parse(p.get("data").asText()).getDayOfWeek() ==
                    DayOfWeek.SATURDAY
                ) v = v + (v * 20) / 100; // fim de semana
                if (p.get("convidados").asInt() > 50) v = v + 5000;
                aprovadas.add(p);
                String vv = v / 100 + "," + String.format("%02d", v % 100);
                out.add(ini + ";aprovada;" + vv);
                smtp.enviar(
                    u.get("email").asText(),
                    "Reserva " + p.get("id").asText() + " confirmada. Valor: R$ " + vv
                );
            } else {
                out.add(ini + ";recusada;" + msg);
                smtp.enviar(
                    u.get("email").asText(),
                    "Reserva " + p.get("id").asText() + " recusada (" + msg + ")"
                );
            }
        }
        Files.createDirectories(Path.of(pasta));
        Files.writeString(
            Path.of(pasta, "reservas.txt"),
            String.join("\n", out) + "\n"
        );
        Files.writeString(Path.of(pasta, "emails.txt"), String.join("\n", log) + "\n");
    }

    public static void main(String[] args) throws Exception {
        processarReservas(args[0], args[1]);
    }
}
