// Testes: o núcleo sem nenhum adaptador real, os adaptadores sem o núcleo real e o
// mesmo contrato verificado nos dois repositórios.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Stream;
import morada.adaptadores.entrada.Cli;
import morada.adaptadores.saida.AgendasEmMemoria;
import morada.adaptadores.saida.AgendasNoPostgres;
import morada.aplicacao.CasosDeUsoDeReservas;
import morada.aplicacao.CasosDeUsoDeReservas.PedidoDeReserva;
import morada.aplicacao.RepositorioDeAgendas;
import morada.aplicacao.ServicoDeReservas;
import morada.dominio.Agenda.Espaco;
import morada.dominio.Erros.NaoEncontradoErro;
import morada.dominio.Erros.RegraVioladaErro;
import morada.main.Montar;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class HexagonalTest {

    static final Espaco SALAO = new Espaco("salao", 15000, 2);

    static PedidoDeReserva pedido(String id) {
        return new PedidoDeReserva(
            id,
            "A-101",
            "salao",
            "2026-03-14",
            14,
            22,
            "2026-03-02"
        );
    }

    @Test
    void oNucleoReservaERecusaSobreposicaoSoComMemoria() {
        var servico = new ServicoDeReservas(new AgendasEmMemoria(List.of(SALAO)));
        assertEquals("R$ 180,00", servico.reservar(pedido("R-1")).taxa());
        var erro = assertThrows(RegraVioladaErro.class, () ->
            servico.reservar(pedido("R-2"))
        );
        assertEquals("horário sobreposto a R-1", erro.getMessage());
    }

    @Test
    void oAdaptadorDeLinhaDeComandoNaoPrecisaDoNucleoDeVerdade() {
        List<String> chamadas = new ArrayList<>();
        var falso = new CasosDeUsoDeReservas() {
            public List<EspacoListado> listarEspacos() {
                return List.of();
            }

            public Confirmacao reservar(PedidoDeReserva p) {
                return null;
            }

            public Cancelamento cancelar(String reserva, String em) {
                chamadas.add(reserva + " " + em);
                return new Cancelamento(reserva, "cancelada", "R$ 0,00");
            }

            public List<ReservaListada> reservasDoEspaco(String espaco) {
                return List.of();
            }
        };
        var resultado = Cli.executar(falso, new String[] {
            "cancelar",
            "R-7",
            "2026-03-01",
        });
        assertEquals(List.of("R-7 2026-03-01"), chamadas);
        assertEquals(new Cli.Resultado("R-7 cancelada, multa R$ 0,00", 0), resultado);
    }

    // Sem banco (na construção da imagem), o caso do PostgreSQL é pulado
    static Stream<Arguments> repositorios() {
        Supplier<RepositorioDeAgendas> memoria = () ->
            new AgendasEmMemoria(List.of(SALAO));
        Supplier<RepositorioDeAgendas> postgres = () -> {
            assumeTrue(System.getenv("BANCO_URL") != null, "sem banco");
            try {
                var agendas = new AgendasNoPostgres(Montar.conectar(), List.of(SALAO));
                agendas.preparar();
                return agendas;
            } catch (Exception erro) {
                throw new IllegalStateException(erro);
            }
        };
        return Stream.of(
            Arguments.of("em memória", memoria),
            Arguments.of("PostgreSQL", postgres)
        );
    }

    // O mesmo contrato vale para qualquer adaptador da porta de saída
    @ParameterizedTest(name = "{0}")
    @MethodSource("repositorios")
    void contratoGuardaAAgendaEAEncontraPelaReserva(
        String nome,
        Supplier<RepositorioDeAgendas> criar
    ) {
        var agendas = criar.get();
        var agenda = agendas.doEspaco("salao");
        agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02");
        agendas.salvar(agenda);
        var ids = agendas
            .daReserva("R-1")
            .reservas()
            .stream()
            .map(r -> r.id())
            .toList();
        assertEquals(List.of("R-1"), ids);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("repositorios")
    void contratoAvisaQuandoAReservaNaoExiste(
        String nome,
        Supplier<RepositorioDeAgendas> criar
    ) {
        var agendas = criar.get();
        assertThrows(NaoEncontradoErro.class, () -> agendas.daReserva("R-9"));
    }
}
