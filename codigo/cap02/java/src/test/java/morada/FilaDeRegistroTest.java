// Testes da simulação da fila de registro: mesma semente, mesmo resultado.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import org.junit.jupiter.api.Test;

class FilaDeRegistroTest {

    private static final FilaDeRegistro.Premissas PREMISSAS =
        new FilaDeRegistro.Premissas(
            "T",
            "teste",
            1000,
            250,
            10,
            100,
            20,
            50,
            3,
            400,
            7
        );

    @Test
    void ingenuaCaudaPassaDoLimiteEHaBoletosSemRegistro() {
        var r = FilaDeRegistro.simular(PREMISSAS, false);
        assertEquals(
            List.of(12L, 1246L, 26L),
            List.of((long) r.arquivos, r.tentativas, (long) r.semRegistro)
        );
        assertEquals(968, FilaDeRegistro.disponiveisAte(r, 400));
        assertEquals(175L, FilaDeRegistro.percentil(r, 1000, 500));
        assertNull(FilaDeRegistro.percentil(r, 1000, 990)); // o p99 cai nos sem registro
    }

    @Test
    void ajustadaTudoDisponivelNoLimiteParteComPix() {
        var r = FilaDeRegistro.simular(PREMISSAS, true);
        assertEquals(
            List.of(11L, 1199L, 32L),
            List.of((long) r.arquivos, r.tentativas, (long) r.viaPix)
        );
        assertEquals(1000, FilaDeRegistro.disponiveisAte(r, 400));
        assertEquals(357L, FilaDeRegistro.percentil(r, 1000, 990));
    }

    @Test
    void mesmaSementeMesmoResultado() {
        var a = FilaDeRegistro.simular(PREMISSAS, false);
        var b = FilaDeRegistro.simular(PREMISSAS, false);
        assertEquals(a.disponivelEm, b.disponivelEm);
        assertEquals(a.tentativas, b.tentativas);
    }
}
