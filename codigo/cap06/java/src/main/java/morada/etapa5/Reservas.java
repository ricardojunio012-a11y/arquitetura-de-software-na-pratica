// Módulo de reservas. Etapa 5: fases separadas (Split Phase) e nenhum estado global.
// decidir() calcula; relatorio() e avisos() formatam; quem lê e grava é o main.
package morada.etapa5;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public final class Reservas {

    private Reservas() {}

    static final int ANTECEDENCIA_MINIMA_DIAS = 2;
    static final int ACRESCIMO_SABADO_PORCENTO = 20;
    static final int LIMITE_DE_CONVIDADOS = 50;
    static final long TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Espaco(String id, long taxa) {}

    public record Unidade(String id, String email, boolean emDebito) {}

    public record Pedido(
        String id,
        String unidade,
        String espaco,
        String data,
        int convidados
    ) {}

    public record Dados(
        List<Espaco> espacos,
        List<Unidade> unidades,
        List<Pedido> pedidos
    ) {}

    public record Decisao(Pedido pedido, String email, String motivo, long valor) {}

    public record Aviso(String para, String texto) {}

    static long diasAte(String dataIso, LocalDate hoje) {
        return ChronoUnit.DAYS.between(hoje, LocalDate.parse(dataIso));
    }

    // O comentário original dizia "fim de semana", mas o código só olha o sábado
    static boolean ehSabado(String dataIso) {
        return LocalDate.parse(dataIso).getDayOfWeek() == DayOfWeek.SATURDAY;
    }

    public static long valorDaReserva(Espaco espaco, Pedido pedido) {
        long valor = espaco.taxa();
        if (ehSabado(pedido.data())) valor += (valor * ACRESCIMO_SABADO_PORCENTO) / 100;
        if (pedido.convidados() > LIMITE_DE_CONVIDADOS) valor += TAXA_DE_LIMPEZA_EXTRA;
        return valor;
    }

    public static String motivoDaRecusa(
        Pedido pedido,
        Unidade unidade,
        LocalDate hoje,
        List<Pedido> aprovadas
    ) {
        if (unidade.emDebito()) return "débito";
        if (
            diasAte(pedido.data(), hoje) < ANTECEDENCIA_MINIMA_DIAS
        ) return "antecedência";
        boolean ocupado = aprovadas
            .stream()
            .anyMatch(
                r ->
                    r.espaco().equals(pedido.espaco()) && r.data().equals(pedido.data())
            );
        return ocupado ? "conflito" : null;
    }

    // Fase 1: decidir cada pedido, em ordem. As aprovadas agora são locais.
    public static List<Decisao> decidir(Dados dados, LocalDate hoje) {
        List<Pedido> aprovadas = new ArrayList<>();
        List<Decisao> decisoes = new ArrayList<>();
        for (Pedido pedido : dados.pedidos()) {
            Unidade unidade = dados
                .unidades()
                .stream()
                .filter(u -> u.id().equals(pedido.unidade()))
                .findFirst()
                .orElseThrow();
            Espaco espaco = dados
                .espacos()
                .stream()
                .filter(e -> e.id().equals(pedido.espaco()))
                .findFirst()
                .orElseThrow();
            String motivo = motivoDaRecusa(pedido, unidade, hoje, aprovadas);
            long valor = 0;
            if (motivo == null) {
                aprovadas.add(pedido);
                valor = valorDaReserva(espaco, pedido);
            }
            decisoes.add(new Decisao(pedido, unidade.email(), motivo, valor));
        }
        return decisoes;
    }

    static String reais(long centavos) {
        return centavos / 100 + "," + String.format("%02d", centavos % 100);
    }

    // Fase 2: formatar o relatório e os avisos a partir das decisões
    public static List<String> relatorio(List<Decisao> decisoes) {
        return decisoes
            .stream()
            .map(d -> {
                Pedido p = d.pedido();
                String inicio = String.join(
                    ";",
                    p.id(),
                    p.unidade(),
                    p.espaco(),
                    p.data()
                );
                return d.motivo() != null
                    ? inicio + ";recusada;" + d.motivo()
                    : inicio + ";aprovada;" + reais(d.valor());
            })
            .toList();
    }

    public static List<Aviso> avisos(List<Decisao> decisoes) {
        return decisoes
            .stream()
            .map(d ->
                new Aviso(
                    d.email(),
                    d.motivo() != null
                        ? "Reserva " +
                              d.pedido().id() +
                              " recusada (" +
                              d.motivo() +
                              ")"
                        : "Reserva " +
                              d.pedido().id() +
                              " confirmada. Valor: R$ " +
                              reais(d.valor())
                )
            )
            .toList();
    }
}
