// Testes: cada camada pode ser testada sem as de cima; o núcleo, sem plugins reais.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.List;
import morada.camadas.aplicacao.ServicoDeReservas;
import morada.camadas.apresentacao.Api;
import morada.camadas.dados.RepositorioDeAgendas;
import morada.camadas.dominio.Agenda;
import morada.camadas.dominio.Agenda.Espaco;
import morada.camadas.dominio.Erros.RegraVioladaErro;
import morada.plugins.Nucleo;
import morada.plugins.PluginDeBanco;
import morada.plugins.PluginDeBanco.Cobranca;
import org.junit.jupiter.api.Test;

class EstilosTest {

    static final Espaco SALAO = new Espaco("salao", 15000, 2);

    @Test
    void oDominioRecusaHorarioSobrepostoSemSaberQueExisteHttp() {
        var agenda = new Agenda(SALAO);
        agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02");
        assertThrows(RegraVioladaErro.class, () ->
            agenda.reservar("R-2", "A-202", "2026-03-14", 20, 23, "2026-03-02")
        );
    }

    @Test
    void aApresentacaoTraduzARegraVioladaEm409() throws Exception {
        var api = Api.criar(
            new ServicoDeReservas(new RepositorioDeAgendas(List.of(SALAO)))
        );
        api.start("127.0.0.1", 0);
        String corpo = """
        {"reserva":"R-1","unidade":"A-101","espaco":"salao","data":"2026-03-03",
         "inicio":10,"fim":12,"em":"2026-03-02"}""";
        var req = HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + api.port() + "/reservas")
        )
            .POST(BodyPublishers.ofString(corpo))
            .build();
        var resposta = HttpClient.newHttpClient().send(req, BodyHandlers.ofString());
        api.stop();
        assertEquals(409, resposta.statusCode());
    }

    record PluginDeTeste(
        String nome,
        java.util.function.Function<Cobranca, String> f
    ) implements PluginDeBanco {
        public String registrar(Cobranca c) {
            return f.apply(c);
        }
    }

    @Test
    void emitePeloPluginInstaladoEAvisaQuandoFaltaPlugin() {
        var nucleo = new Nucleo();
        nucleo.instalar(new PluginDeTeste("teste", c -> "T-" + c.unidade()));
        assertEquals(
            "A-1;R$ 1,00;teste;T-A-1",
            nucleo.emitir(new Cobranca("A-1", 100, "teste"))
        );
        assertEquals(
            "A-1;R$ 1,00;zeta;sem plugin para o banco zeta",
            nucleo.emitir(new Cobranca("A-1", 100, "zeta"))
        );
    }

    @Test
    void umPluginComDefeitoNaoDerrubaONucleo() {
        var nucleo = new Nucleo();
        nucleo.instalar(
            new PluginDeTeste("quebrado", c -> {
                throw new IllegalStateException("fora do ar");
            })
        );
        assertEquals(
            "A-1;R$ 1,00;quebrado;falha no plugin quebrado: fora do ar",
            nucleo.emitir(new Cobranca("A-1", 100, "quebrado"))
        );
    }

    @Test
    void recusaUmPluginQueNaoCumpreOContrato() {
        var erro = assertThrows(IllegalArgumentException.class, () ->
            new Nucleo().instalar(new Object())
        );
        assertEquals("plugin não cumpre o contrato", erro.getMessage());
    }
}
