// "Agora a parte difícil": dois pedidos para o mesmo espaço e a mesma data
// chegam ao mesmo tempo. A intercalação é forçada, para a saída ser sempre igual:
// os dois passam pela cadeia antes de qualquer um gravar.
package morada;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import morada.Aprovacao.Etapa;
import morada.Estado.Reserva;
import morada.Repositorio.RepositorioDeReservas;
import morada.Tipos.Pedido;

public final class Corrida {

    private Corrida() {}

    public record Montagem(Etapa cadeia, RepositorioDeReservas reservas) {}

    public static List<String> corrida(
        List<Pedido> pedidos,
        Supplier<Montagem> montar
    ) {
        Pedido primeiro = pedidos.get(0);
        List<String> linhas = new ArrayList<>();
        linhas.add(
            "Pedidos simultâneos: " +
                primeiro.espaco().nome() +
                " em " +
                Tipos.dataBr(primeiro.data())
        );
        for (boolean protegido : new boolean[] { false, true }) {
            linhas.add(
                protegido
                    ? "gravar só se o espaço estiver livre, numa operação só:"
                    : "verificar e depois gravar (check-then-act):"
            );
            Montagem m = montar.get();
            // 1. Os dois verificam: o espaço está livre para ambos
            List<Pedido> aprovados = new ArrayList<>();
            for (Pedido p : pedidos) {
                var d = m.cadeia().avaliar(p);
                String texto = d.aprovada() ? "passou na cadeia" : d.motivo();
                linhas.add("  " + p.id() + " " + p.unidade().id() + ": " + texto);
                if (d.aprovada()) aprovados.add(p);
            }
            // 2. Os dois gravam
            for (Pedido p : aprovados) {
                var reserva = new Reserva(p);
                boolean gravou = protegido ? m.reservas().salvarSeLivre(reserva) : true;
                if (!protegido) m.reservas().salvar(reserva);
                if (gravou) reserva.aprovar();
                linhas.add(
                    "  " + p.id() + " " + (gravou ? "gravada" : "recusada na gravação")
                );
            }
            long n = pedidos
                .stream()
                .filter(p ->
                    m
                        .reservas()
                        .buscar(p.id())
                        .map(r -> r.estado().equals("aprovada"))
                        .orElse(false)
                )
                .count();
            String resultado =
                n == 1 ? "1 reserva aprovada" : n + " reservas aprovadas";
            String dupla = n > 1 ? " (reserva dupla)" : "";
            linhas.add("  resultado: " + resultado + dupla);
        }
        return linhas;
    }
}
