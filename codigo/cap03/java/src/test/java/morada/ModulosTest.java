// Testes: o acoplamento escondido do "antes" e o isolamento do "depois".
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import morada.antes.config.Config;
import morada.antes.servicos.Servicos;
import morada.depois.cobranca.Cobranca;
import morada.depois.cobranca.Cobrancas;
import morada.depois.cobranca.Unidade;
import morada.depois.inadimplencia.Inadimplencia;
import org.junit.jupiter.api.Test;

class ModulosTest {

    static final LocalDate HOJE = LocalDate.of(2026, 3, 2);

    // Condomínio pequeno no próprio teste: os testes rodam na construção da imagem
    static final String DADOS = """
    {"condominio": {"id": "t", "nome": "Teste", "despesasDoMesCentavos": 485000},
     "unidades": [
       {"id": "A-101", "fracaoMilionesimos": 500000, "morador": {"nome": "Ana"},
        "debitoAnterior": null},
       {"id": "A-102", "fracaoMilionesimos": 250000, "morador": {"nome": "Bruno"},
        "debitoAnterior": {"valorCentavos": 59400, "vencimento": "2026-01-10"}},
       {"id": "A-201", "fracaoMilionesimos": 250000, "morador": {"nome": "Carla"},
        "debitoAnterior": {"valorCentavos": 66750, "vencimento": "2026-02-10"}}],
     "despesas": [], "fundoDeReservaSaldoAnteriorCentavos": 0}
    """;

    @Test
    void antesInadimplenciaMudaAOrdemDasCobrancasDeOutroModulo() throws Exception {
        Servicos.cobrancas.clear();
        Config.hoje = HOJE;
        Config.dados = new ObjectMapper().readTree(DADOS);
        Servicos.calcularTodas();
        String ordemOriginal = ordem(
            Servicos.cobrancas
                .stream()
                .map(c -> c.unidade.get("id").asText())
                .toList()
        );
        Servicos.gerarSaida("inadimplencia");
        String ordemDepois = ordem(
            Servicos.cobrancas
                .stream()
                .map(c -> c.unidade.get("id").asText())
                .toList()
        );
        assertNotEquals(ordemOriginal, ordemDepois);
    }

    @Test
    void depoisInadimplenciaNaoAlteraAsCobrancas() throws Exception {
        List<Cobranca> lista = Cobrancas.calcular(485000, unidades(), HOJE);
        String antes = ordem(lista.stream().map(Cobranca::unidade).toList());
        Inadimplencia.relatorio("Teste", HOJE, lista);
        assertEquals(antes, ordem(lista.stream().map(Cobranca::unidade).toList()));
    }

    @Test
    void depoisCalculaEncargosSemConfiguracaoGlobal() throws Exception {
        Cobranca carla = Cobrancas.calcular(
            485000,
            List.of(unidades().get(2)),
            HOJE
        ).get(0);
        assertEquals(
            List.of(20L, 1335L, 445L),
            List.of(carla.diasDeAtraso(), carla.multa(), carla.juros())
        );
    }

    static List<Unidade> unidades() throws Exception {
        var mapper = new ObjectMapper();
        JsonNode raiz = mapper.readTree(DADOS);
        return mapper.readerForListOf(Unidade.class).readValue(raiz.get("unidades"));
    }

    static String ordem(List<String> ids) {
        return String.join(",", ids);
    }
}
