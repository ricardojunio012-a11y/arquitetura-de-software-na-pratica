// O balde de fichas: deixa passar a rajada, recusa o excesso e se recompõe com o tempo.
package morada;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class BaldeTest {

    @Test
    void permiteARajadaRecusaOExcessoEGanhaFichasComOTempo() {
        var balde = new BaldeDeFichas(10, 20);
        for (int i = 0; i < 10; i++) assertTrue(balde.permite(0));
        assertFalse(balde.permite(0));
        // 20 fichas por segundo: uma ficha a cada 50 ms
        assertFalse(balde.permite(49));
        assertTrue(balde.permite(99));
    }
}
