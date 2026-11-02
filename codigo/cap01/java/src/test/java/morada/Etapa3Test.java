// Testes de unidade da etapa 3: possíveis porque o cálculo foi separado do resto.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.etapa3.Aplicacao;
import morada.etapa3.Aviso;
import morada.etapa3.Boleto;
import morada.etapa3.Calculo;
import morada.etapa3.Cobranca;
import morada.etapa3.DadosDoCondominio;
import morada.etapa3.Unidade;
import org.junit.jupiter.api.Test;

class Etapa3Test {

    static final LocalDate HOJE = LocalDate.of(2026, 3, 2);

    static Unidade unidade(String id, long fracao, Unidade.DebitoAnterior debito) {
        return new Unidade(
            id,
            fracao,
            new Unidade.Morador("Ana", "ana@example.com", null, "email"),
            "boleto",
            debito
        );
    }

    @Test
    void divideAsDespesasPelaFracaoESomaFundoDeReserva() {
        Cobranca c = Calculo.calcularCobranca(
            485000,
            unidade("A-101", 125000, null),
            HOJE
        );
        assertEquals(60625, c.taxa());
        assertEquals(6063, c.fundo());
        assertEquals(66688, c.total());
    }

    @Test
    void cobraMultaEJurosProporcionaisAosDiasDeAtraso() {
        Unidade u = unidade(
            "A-101",
            125000,
            new Unidade.DebitoAnterior(66750, "2026-02-10")
        );
        Cobranca c = Calculo.calcularCobranca(485000, u, HOJE);
        assertEquals(1335, c.multa());
        assertEquals(445, c.juros()); // 20 dias
        assertEquals(66688 + 66750 + 1335 + 445, c.total());
    }

    @Test
    void avisaCadaMoradorUmaVezSemEnviarNada() {
        List<Aviso> avisos = new ArrayList<>();
        DadosDoCondominio dados = new DadosDoCondominio(
            new DadosDoCondominio.Condominio("teste", "Condomínio Teste", 100000),
            List.of(unidade("A-101", 500000, null), unidade("A-102", 500000, null))
        );
        Aplicacao.gerarCobrancaMensal(dados, HOJE, new Boleto(), avisos::add);
        assertEquals(
            List.of("A-101", "A-102"),
            avisos
                .stream()
                .map(a -> a.cobranca().unidade().id())
                .toList()
        );
        assertEquals("BOL-teste-202603-A-101-55000", avisos.get(0).codigoDePagamento());
    }
}
