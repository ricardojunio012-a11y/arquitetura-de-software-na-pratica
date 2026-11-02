// Testes de integração: o repositório contra um PostgreSQL real, em contêiner.
// Na construção da imagem não há banco, e por isso eles são pulados.
package morada;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import morada.comunicacao.AvisosNoPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class IntegracaoTest {

    @BeforeEach
    void precisaDeBanco() {
        assumeTrue(System.getenv("BANCO_URL") != null, "sem banco");
    }

    @Test
    void gravaUmAvisoEOEncontraDepois() throws Exception {
        try (var avisos = AvisosNoPostgres.conectar(System.getenv("BANCO_URL"))) {
            assertFalse(avisos.jaEnviado("E-1"));
            avisos.registrar("E-1", "pagamento recebido");
            assertTrue(avisos.jaEnviado("E-1"));
        }
    }

    @Test
    void oBancoRecusaOMesmoAvisoDuasVezes() throws Exception {
        try (var avisos = AvisosNoPostgres.conectar(System.getenv("BANCO_URL"))) {
            avisos.registrar("E-1", "pagamento recebido");
            assertThrows(IllegalStateException.class, () ->
                avisos.registrar("E-1", "pagamento recebido")
            );
        }
    }
}
