// Testes de caracterização: descrevem o que o código faz hoje, inclusive o que
// talvez esteja errado. Mudar o comportamento é outro passo, com outro commit.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import morada.etapa5.Reservas;
import morada.etapa5.Reservas.Espaco;
import morada.etapa5.Reservas.Pedido;
import morada.etapa5.Reservas.Unidade;
import org.junit.jupiter.api.Test;

class ReservasTest {

    static final LocalDate HOJE = LocalDate.of(2026, 3, 2);
    static final Espaco SALAO = new Espaco("salao", 15000);

    // Só roda no "testes", com /dados montado; na construção da imagem, é pulado
    @Test
    void aSaidaEIdenticaAoResultadoAprovado() throws Exception {
        assumeTrue(Files.exists(Path.of("/dados/esperado/reservas.txt")));
        var dados = new ObjectMapper().readValue(
            Path.of("/dados/entrada/reservas.json").toFile(),
            Reservas.Dados.class
        );
        var decisoes = Reservas.decidir(dados, HOJE);
        List<String> emails = Reservas.avisos(decisoes)
            .stream()
            .map(a -> "para " + a.para() + ": " + a.texto())
            .toList();
        assertEquals(
            Files.readString(Path.of("/dados/esperado/reservas.txt")),
            String.join("\n", Reservas.relatorio(decisoes)) + "\n"
        );
        assertEquals(
            Files.readString(Path.of("/dados/esperado/emails.txt")),
            String.join("\n", emails) + "\n"
        );
    }

    @Test
    void domingoNaoTemAcrescimoDeFimDeSemanaComportamentoAtual() {
        var domingo = new Pedido("R", "A", "salao", "2026-03-15", 1);
        var sabado = new Pedido("R", "A", "salao", "2026-03-14", 1);
        assertEquals(15000, Reservas.valorDaReserva(SALAO, domingo));
        assertEquals(18000, Reservas.valorDaReserva(SALAO, sabado));
    }

    @Test
    void aPrimeiraRegraQueFalhaDecideOMotivo() {
        var pedido = new Pedido("R", "A", "salao", "2026-03-03", 1);
        var emDebito = new Unidade("A", "a@x.com", true);
        assertEquals(
            "débito",
            Reservas.motivoDaRecusa(pedido, emDebito, HOJE, List.of())
        );
        var emDia = new Unidade("A", "a@x.com", false);
        assertEquals(
            "antecedência",
            Reservas.motivoDaRecusa(pedido, emDia, HOJE, List.of())
        );
    }
}
