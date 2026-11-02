// Testes: a tela inicial numa chamada, o lote idempotente e o conflito detectado.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashMap;
import java.util.List;
import morada.Backend.Convidado;
import morada.Backend.Encomenda;
import morada.Backend.Portaria;
import morada.Backend.Reservas;
import morada.BffPorteiro.Operacao;
import org.junit.jupiter.api.Test;

class BffTest {

    static final Operacao ENTREGAR = new Operacao(
        "op-A1",
        "entregar",
        "09:00",
        "E-1",
        1,
        null,
        null
    );

    static BffPorteiro montar() {
        return new BffPorteiro(
            new Portaria(List.of(new Encomenda("E-1", "A-1"))),
            new Reservas(List.of(new Convidado("Ana", "R-1", "salao")))
        );
    }

    @Test
    void montaATelaInicialNumaChamada() {
        var tela = montar().inicio();
        assertEquals("E-1", tela.encomendasPendentes().get(0).encomenda());
        assertEquals("Ana", tela.visitantesEsperados().get(0).nome());
    }

    @Test
    void naoConfundeVisitanteComOutroCujoNomeContemODele() {
        var bff = new BffPorteiro(
            new Portaria(List.of()),
            new Reservas(
                List.of(
                    new Convidado("Ana", "R-1", "salao"),
                    new Convidado("Maria Ana", "R-1", "salao")
                )
            )
        );
        var visita = new Operacao(
            "op-A1",
            "registrarVisitante",
            "09:00",
            null,
            null,
            "Maria Ana",
            "R-1"
        );
        bff.sincronizar("A", List.of(visita));
        var esperados = bff.inicio().visitantesEsperados();
        assertEquals(
            List.of("Ana"),
            esperados
                .stream()
                .map(c -> c.nome())
                .toList()
        );
    }

    @Test
    void comResultadosPersistidosReconheceOLoteDepoisDeReiniciar() {
        var portaria = new Portaria(List.of(new Encomenda("E-1", "A-1")));
        var reservas = new Reservas(List.of());
        var tabela = new HashMap<String, String>();
        new BffPorteiro(portaria, reservas, tabela).sincronizar("A", List.of(ENTREGAR));
        var depois = new BffPorteiro(portaria, reservas, tabela);
        var resultado = depois.sincronizar("A", List.of(ENTREGAR)).get(0).resultado();
        assertEquals("aplicada", resultado);
        assertEquals(1, depois.repetidas);
    }

    @Test
    void naoAplicaDuasVezesUmLoteReenviado() {
        var bff = montar();
        bff.sincronizar("A", List.of(ENTREGAR));
        var resultado = bff.sincronizar("A", List.of(ENTREGAR)).get(0).resultado();
        assertEquals("aplicada", resultado);
        assertEquals(1, bff.repetidas);
    }

    @Test
    void acusaConflitoQuandoAEncomendaMudou() {
        var bff = montar();
        var devolver = new Operacao("op-B1", "devolver", "09:00", "E-1", 1, null, null);
        bff.sincronizar("B", List.of(devolver));
        var resultado = bff.sincronizar("A", List.of(ENTREGAR)).get(0).resultado();
        assertEquals("conflito: E-1 já devolvida pelo tablet B às 09:00", resultado);
    }
}
