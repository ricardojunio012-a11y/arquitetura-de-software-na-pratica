// Testes: cada módulo testado pela própria API, Reservas testado sem o Financeiro, e
// as regras de arquitetura verificadas nas duas versões.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import java.util.List;
import morada.depois.modulos.financeiro.Financeiro;
import morada.depois.modulos.financeiro.interno.TabelaDeCobrancas;
import morada.depois.modulos.reservas.Reservas;
import morada.depois.modulos.reservas.Reservas.RecusaErro;
import org.junit.jupiter.api.Test;

class ModulosTest {

    @Test
    void parcelamentoDeixaAUnidadeEmDia() {
        var financeiro = new Financeiro(new TabelaDeCobrancas());
        financeiro.emitir("C-1", "B-101", 58685, "2026-02-10");
        assertFalse(financeiro.unidadeEmDia("B-101", "2026-03-02"));
        financeiro.parcelar("C-1", 3);
        assertTrue(financeiro.unidadeEmDia("B-101", "2026-03-02"));
    }

    @Test
    void recusaUnidadeEmDebitoComFinanceiroDeMentira() {
        var reservas = new Reservas(List.of("salao"), (unidade, hoje) -> false);
        assertThrows(RecusaErro.class, () ->
            reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02")
        );
    }

    @Test
    void naoAceitaDuasReservasDoMesmoEspacoNoMesmoDia() {
        var reservas = new Reservas(List.of("salao"), (unidade, hoje) -> true);
        reservas.reservar("R-1", "A-1", "salao", "2026-03-14", "2026-03-02");
        var erro = assertThrows(RecusaErro.class, () ->
            reservas.reservar("R-2", "A-2", "salao", "2026-03-14", "2026-03-02")
        );
        assertEquals("salao já reservado em 2026-03-14", erro.getMessage());
    }

    @Test
    void depoisRespeitaAsFronteirasEAntesNao() {
        var depois = new ClassFileImporter().importPackages("morada.depois");
        Arquitetura.regras("depois").forEach(regra -> regra.check(depois));
        var antes = new ClassFileImporter().importPackages("morada.antes");
        assertTrue(Arquitetura.regras("antes").get(0).evaluate(antes).hasViolation());
    }
}
