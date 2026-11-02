// Adaptador de entrada de linha de comando: os mesmos casos de uso, acionados por
// argumentos e respondidos em texto para uma pessoa ler no terminal.
package morada.adaptadores.entrada;

import java.util.Arrays;
import java.util.stream.Collectors;
import morada.aplicacao.CasosDeUsoDeReservas;
import morada.aplicacao.CasosDeUsoDeReservas.PedidoDeReserva;

public class Cli {

    // O texto a mostrar e o código de saída do processo (0 = deu certo)
    public record Resultado(String texto, int codigo) {}

    static final String USO_RESERVAR =
        "uso: reservar <reserva> <unidade> <espaco> <data> <inicio> <fim> <hoje>";

    public static Resultado executar(CasosDeUsoDeReservas reservas, String[] args) {
        String comando = args.length > 0 ? args[0] : "";
        String[] resto = Arrays.copyOfRange(
            args,
            Math.min(1, args.length),
            args.length
        );
        try {
            switch (comando) {
                case "espacos" -> {
                    String linhas = reservas
                        .listarEspacos()
                        .stream()
                        .map(
                            e ->
                                e.id() +
                                ": taxa " +
                                e.taxa() +
                                ", antecedência de " +
                                e.antecedenciaMinimaDias() +
                                " dia(s)"
                        )
                        .collect(Collectors.joining("\n"));
                    return new Resultado(linhas, 0);
                }
                case "reservar" -> {
                    if (resto.length != 7) return new Resultado(USO_RESERVAR, 2);
                    var c = reservas.reservar(
                        new PedidoDeReserva(
                            resto[0],
                            resto[1],
                            resto[2],
                            resto[3],
                            Integer.parseInt(resto[4]),
                            Integer.parseInt(resto[5]),
                            resto[6]
                        )
                    );
                    return new Resultado(
                        c.reserva() + " confirmada, taxa " + c.taxa(),
                        0
                    );
                }
                case "cancelar" -> {
                    var c = reservas.cancelar(resto[0], resto[1]);
                    return new Resultado(
                        c.reserva() + " cancelada, multa " + c.multa(),
                        0
                    );
                }
                case "reservas" -> {
                    var lista = reservas.reservasDoEspaco(resto[0]);
                    if (lista.isEmpty()) return new Resultado("nenhuma reserva", 0);
                    String linhas = lista
                        .stream()
                        .map(r -> r.reserva() + " " + r.unidade() + " " + r.periodo())
                        .collect(Collectors.joining("\n"));
                    return new Resultado(linhas, 0);
                }
                default -> {
                    return new Resultado(
                        "comandos: espacos, reservar, cancelar, reservas",
                        2
                    );
                }
            }
        } catch (RuntimeException erro) {
            return new Resultado("erro: " + erro.getMessage(), 1);
        }
    }
}
