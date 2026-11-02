// Serviço que concentra todas as regras. As regras só valem se quem altera os dados
// lembrar de passar por aqui; nada impede outro código de mexer nas reservas direto.
package morada.antes;

import static morada.antes.Modelo.reservas;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import morada.antes.Modelo.Reserva;

public final class Servico {

    private Servico() {}

    static long dias(String de, String ate) {
        return ChronoUnit.DAYS.between(LocalDate.parse(de), LocalDate.parse(ate));
    }

    static String formatar(long centavos) {
        String inteiro = String.format(Locale.of("pt", "BR"), "%,d", centavos / 100);
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }

    public static String reservar(JsonNode c, JsonNode espaco, List<String> eventos) {
        String data = c.get("data").asText();
        int inicio = c.get("inicio").asInt();
        int fim = c.get("fim").asInt();
        String esp = c.get("espaco").asText();
        String unidade = c.get("unidade").asText();
        if (
            fim <= inicio
        ) return "recusada;período inválido: o fim deve ser depois do início";
        if (
            dias(c.get("em").asText(), data) <
            espaco.get("antecedenciaMinimaDias").asInt()
        ) {
            return "recusada;antecedência mínima não respeitada";
        }
        for (Reserva r : reservas) {
            boolean mesmoHorario =
                r.data.equals(data) && r.inicio < fim && inicio < r.fim;
            if (
                r.espaco.equals(esp) && r.situacao.equals("confirmada") && mesmoHorario
            ) {
                return "recusada;horário sobreposto a " + r.id;
            }
        }
        long doMes = reservas
            .stream()
            .filter(r -> r.espaco.equals(esp) && r.unidade.equals(unidade))
            .filter(r -> r.situacao.equals("confirmada"))
            .filter(r -> r.data.substring(0, 7).equals(data.substring(0, 7)))
            .count();
        if (doMes >= espaco.get("limitePorMes").asInt()) {
            return "recusada;limite mensal da unidade atingido";
        }

        long taxa = espaco.get("taxaCentavos").asLong();
        DayOfWeek dia = LocalDate.parse(data).getDayOfWeek();
        if (dia == DayOfWeek.SATURDAY || dia == DayOfWeek.SUNDAY) taxa +=
            (taxa * 20 + 50) / 100;
        Reserva r = new Reserva();
        r.id = c.get("reserva").asText();
        r.unidade = unidade;
        r.espaco = esp;
        r.data = data;
        r.inicio = inicio;
        r.fim = fim;
        r.taxaCentavos = taxa;
        reservas.add(r);
        String periodo = data + " " + inicio + "h-" + fim + "h";
        eventos.add(
            "ReservaConfirmada;" +
                r.id +
                ";" +
                esp +
                ";" +
                periodo +
                ";" +
                unidade +
                ";" +
                formatar(taxa)
        );
        return "confirmada;" + formatar(taxa);
    }

    public static String cancelar(JsonNode c, List<String> eventos) {
        String id = c.get("reserva").asText();
        Reserva r = reservas
            .stream()
            .filter(x -> x.id.equals(id))
            .findFirst()
            .orElse(null);
        if (r == null) return "não cancelada;reserva não encontrada";
        if (!r.situacao.equals("confirmada")) {
            return "não cancelada;reserva não está confirmada";
        }
        r.situacao = "cancelada";
        long multa =
            dias(c.get("em").asText(), r.data) < 2
                ? (r.taxaCentavos * 50 + 50) / 100
                : 0;
        String detalhe = multa > 0 ? "multa " + formatar(multa) : "sem multa";
        eventos.add("ReservaCancelada;" + r.id + ";" + detalhe);
        return "cancelada;" + detalhe;
    }
}
