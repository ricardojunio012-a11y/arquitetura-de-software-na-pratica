// Testes do executor de cenários: verificam a carga e a avaliação, não o tempo.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import morada.cobranca.Unidade;
import org.junit.jupiter.api.Test;

class CenariosTest {

    @Test
    void geraAsUnidadesComFracoesQueSomamOCondominio() {
        var unidades = Cenarios.condominioSintetico(1, 40).unidades();
        assertEquals(40, unidades.size());
        assertEquals(
            1000000,
            unidades.stream().mapToLong(Unidade::fracaoMilionesimos).sum()
        );
        assertEquals(
            5,
            unidades
                .stream()
                .filter(u -> u.debitoAnterior() != null)
                .count()
        );
    }

    @Test
    void passaDentroDoLimiteEFalhaAcima() {
        assertTrue(Cenarios.avaliar(59.9, 60));
        assertFalse(Cenarios.avaliar(60.1, 60));
    }

    @Test
    void estimaORegistroPelaCapacidadeDoBanco() {
        var cenario = new Cenarios.Cenario("T", "teste", 3, 10, 10, 2);
        var r = Cenarios.executar(cenario, LocalDate.of(2026, 3, 2));
        assertEquals(30, r.cobrancas());
        assertEquals(3.0, r.segundosRegistro());
        assertFalse(r.passou()); // 3 s de registro não cabem em 2 s
    }
}
