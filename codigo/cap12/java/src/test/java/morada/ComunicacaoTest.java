// Testes: o módulo de Comunicação é o mesmo dentro e fora do monólito.
package morada;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ComunicacaoTest {

    @Test
    void enviaCadaAvisoUmaVezSoMesmoPedidoDeNovo() {
        var comunicacao = new Comunicacao();
        assertTrue(comunicacao.avisar("E-P-001", "pagamento recebido"));
        assertFalse(comunicacao.avisar("E-P-001", "pagamento recebido"));
        assertTrue(comunicacao.avisar("E-P-002", "pagamento recebido"));
    }
}
