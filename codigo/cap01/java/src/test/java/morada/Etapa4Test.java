// Testes de unidade das três mudanças, feitas sobre o código refatorado.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import morada.etapa4.Aplicacao;
import morada.etapa4.Boleto;
import morada.etapa4.Calculo;
import morada.etapa4.DadosDoCondominio;
import morada.etapa4.Notificador;
import morada.etapa4.Pix;
import morada.etapa4.Unidade;
import org.junit.jupiter.api.Test;

class Etapa4Test {

    static final LocalDate HOJE = LocalDate.of(2026, 3, 2);
    static final Unidade.Morador ANA = new Unidade.Morador(
        "Ana",
        "ana@example.com",
        null,
        "email"
    );

    @Test
    void daDescontoDePontualidadeParaQuemNaoTemDebito() {
        Unidade u = new Unidade("A-101", 125000, ANA, "boleto", null);
        assertEquals(
            66688 - 3031,
            Calculo.calcularCobranca(485000, u, HOJE).totalAte05()
        );
    }

    @Test
    void naoDaDescontoParaQuemTemDebito() {
        Unidade u = new Unidade(
            "A-101",
            125000,
            ANA,
            "boleto",
            new Unidade.DebitoAnterior(1000, "2026-02-10")
        );
        assertNull(Calculo.calcularCobranca(485000, u, HOJE).totalAte05());
    }

    @Test
    void usaPixEWhatsAppQuandoAUnidadePede() {
        List<String> email = new ArrayList<>();
        List<String> whatsapp = new ArrayList<>();
        Notificador porEmail = aviso -> email.add(aviso.codigoDePagamento());
        Notificador porWhatsApp = aviso -> whatsapp.add(aviso.codigoDePagamento());
        Unidade.Morador bia = new Unidade.Morador(
            "Bia",
            "bia@example.com",
            "+5511900000000",
            "whatsapp"
        );
        DadosDoCondominio dados = new DadosDoCondominio(
            new DadosDoCondominio.Condominio("teste", "Condomínio Teste", 100000),
            List.of(
                new Unidade("A-101", 500000, ANA, "boleto", null),
                new Unidade("A-102", 500000, bia, "pix", null)
            )
        );
        Aplicacao.gerarCobrancaMensal(
            dados,
            HOJE,
            Map.of("boleto", new Boleto(), "pix", new Pix()),
            Map.of("email", porEmail, "whatsapp", porWhatsApp)
        );
        assertEquals(List.of("BOL-teste-202603-A-101-55000"), email);
        assertEquals(List.of("PIX-teste-202603-A-102-55000"), whatsapp);
    }
}
