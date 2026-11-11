// O fundo de reserva: a formatação em reais e duas saídas simultâneas com a linha
// do fundo travada, que nunca deixam o saldo negativo.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;

class FundoTest {

    @Test
    void reaisFormataCentavosComSeparadorDeMilharESinal() {
        assertEquals("1.000,00", Fundo.reais(100000));
        assertEquals("-300,00", Fundo.reais(-30000));
        assertEquals("0,05", Fundo.reais(5));
    }

    @Test
    void saidasSimultaneasComOFundoTravadoNaoDeixamOSaldoNegativo() throws Exception {
        String url = System.getenv("BANCO_URL");
        assumeTrue(url != null, "sem banco");
        try (var banco = Banco.conectar(url)) {
            Banco.recriarEsquema(banco);
            Migracoes.aplicar(banco, Path.of("/dados/migracoes"));
            Fundo.preparar(banco);
            List<Callable<Boolean>> saidas = List.of(
                () -> {
                    try (var c = Banco.conectar(url)) {
                        return Fundo.registrarSaida(c, 1, 70000, "conserto do portão");
                    }
                },
                () -> {
                    try (var c = Banco.conectar(url)) {
                        return Fundo.registrarSaida(c, 1, 60000, "pintura da fachada");
                    }
                }
            );
            try (var execucao = Executors.newFixedThreadPool(2)) {
                long registradas = 0;
                for (var futuro : execucao.invokeAll(saidas))
                    if (futuro.get()) registradas++;
                assertEquals(1, registradas);
            }
            assertTrue(Fundo.saldo(banco, 1) >= 0);
        }
    }
}
