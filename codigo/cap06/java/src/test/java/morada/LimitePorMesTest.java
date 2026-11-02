// Os testes da classe-broto: a regra nova é testada sozinha, sem o código legado.
package morada;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import morada.etapa6.LimitePorMes;
import morada.etapa6.LimitePorMes.Reserva;
import org.junit.jupiter.api.Test;

class LimitePorMesTest {

    final LimitePorMes limite = new LimitePorMes();

    static Reserva salao(String unidade, String data) {
        return new Reserva(unidade, "salao", data);
    }

    static Reserva churrasco(String data) {
        return new Reserva("A-101", "churrasqueira", data);
    }

    @Test
    void recusaASegundaReservaDoSalaoNoMesmoMes() {
        var feitas = List.of(salao("A-101", "2026-03-14"));
        assertTrue(limite.atingido(salao("A-101", "2026-03-28"), feitas));
    }

    @Test
    void naoContaOutroMesOutraUnidadeNemOutroEspaco() {
        var feitas = List.of(
            salao("A-101", "2026-02-28"),
            salao("B-101", "2026-03-14"),
            churrasco("2026-03-07")
        );
        assertFalse(limite.atingido(salao("A-101", "2026-03-28"), feitas));
    }

    @Test
    void churrasqueiraAceitaDuasEEspacoSemLimiteAceitaTodas() {
        var duas = List.of(churrasco("2026-03-07"), churrasco("2026-03-14"));
        assertFalse(limite.atingido(churrasco("2026-03-21"), duas.subList(0, 1)));
        assertTrue(limite.atingido(churrasco("2026-03-21"), duas));
        var piscina = new Reserva("A-101", "piscina", "2026-03-21");
        assertFalse(limite.atingido(piscina, List.of(piscina, piscina)));
    }
}
