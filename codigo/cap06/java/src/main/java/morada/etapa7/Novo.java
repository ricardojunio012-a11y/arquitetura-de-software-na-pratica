// O código novo: o módulo refatorado da etapa 5 mais a regra do limite, que já nasceu
// separada na etapa 6 (a classe-broto) e por isso migra sem ser reescrita.
package morada.etapa7;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.etapa5.Reservas;
import morada.etapa5.Reservas.Decisao;
import morada.etapa5.Reservas.Pedido;
import morada.etapa6.LimitePorMes;

public final class Novo {

    private Novo() {}

    public static List<Decisao> decidir(Reservas.Dados dados, LocalDate hoje) {
        LimitePorMes limite = new LimitePorMes();
        List<Pedido> aprovadas = new ArrayList<>();
        List<Decisao> decisoes = new ArrayList<>();
        for (Pedido pedido : dados.pedidos()) {
            var unidade = dados
                .unidades()
                .stream()
                .filter(u -> u.id().equals(pedido.unidade()))
                .findFirst()
                .orElseThrow();
            var espaco = dados
                .espacos()
                .stream()
                .filter(e -> e.id().equals(pedido.espaco()))
                .findFirst()
                .orElseThrow();
            String motivo = Reservas.motivoDaRecusa(pedido, unidade, hoje, aprovadas);
            if (
                motivo == null && limite.atingido(reserva(pedido), doMes(aprovadas))
            ) motivo = "limite de reservas do mês atingido";
            long valor = 0;
            if (motivo == null) {
                aprovadas.add(pedido);
                valor = Reservas.valorDaReserva(espaco, pedido);
            }
            decisoes.add(new Decisao(pedido, unidade.email(), motivo, valor));
        }
        return decisoes;
    }

    static LimitePorMes.Reserva reserva(Pedido p) {
        return new LimitePorMes.Reserva(p.unidade(), p.espaco(), p.data());
    }

    static List<LimitePorMes.Reserva> doMes(List<Pedido> aprovadas) {
        return aprovadas.stream().map(Novo::reserva).toList();
    }
}
