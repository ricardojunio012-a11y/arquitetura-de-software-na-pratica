// Testes de integração da idempotência contra o PostgreSQL: cinco pedidos
// simultâneos com a mesma chave resultam num único pagamento, e todos recebem a mesma
// resposta; a mesma chave em duas administradoras são dois pedidos diferentes.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.IntStream;
import morada.api.Api;
import morada.api.Banco;
import org.junit.jupiter.api.Test;

class IdempotenciaTest {

    static final HttpClient CLIENTE = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();

    static HttpRequest pagar(
        String url,
        String administradora,
        String cobranca,
        int valor
    ) {
        String corpo =
            "{\"cobranca\":\"" + cobranca + "\",\"valorCentavos\":" + valor + "}";
        return HttpRequest.newBuilder(URI.create(url + "/v1/pagamentos"))
            .header("Content-Type", "application/json")
            .header("Morada-Administradora", administradora)
            .header("Idempotency-Key", "k-1")
            .POST(BodyPublishers.ofString(corpo))
            .build();
    }

    static long totalDePagamentos(String urlBanco) throws Exception {
        try (var banco = Banco.conectar(urlBanco); var sql = banco.createStatement()) {
            var total = sql.executeQuery("SELECT count(*) FROM pagamentos");
            total.next();
            return total.getLong(1);
        }
    }

    @Test
    void pedidosSimultaneosComAMesmaChavePagamUmaVezSo() throws Exception {
        String urlBanco = System.getenv("BANCO_URL");
        assumeTrue(urlBanco != null, "sem banco");
        Banco.preparar(urlBanco, "/dados/entrada/cobrancas.json");
        var api = Api.criar(urlBanco);
        String url = Api.subir(api);
        var pedido = pagar(url, "ADM-A", "CB-04", 45000);
        List<HttpResponse<String>> respostas = IntStream.range(0, 5)
            .mapToObj(i -> CLIENTE.sendAsync(pedido, BodyHandlers.ofString()))
            .toList()
            .stream()
            .map(CompletableFuture::join)
            .toList();
        api.stop(0);
        assertEquals(
            List.of(201, 201, 201, 201, 201),
            respostas.stream().map(HttpResponse::statusCode).toList()
        );
        // Todos recebem exatamente a mesma resposta, com o mesmo pagamento
        assertEquals(1, respostas.stream().map(HttpResponse::body).distinct().count());
        assertEquals(1, totalDePagamentos(urlBanco));
    }

    @Test
    void aMesmaChaveEmDuasAdministradorasNaoColide() throws Exception {
        String urlBanco = System.getenv("BANCO_URL");
        assumeTrue(urlBanco != null, "sem banco");
        Banco.preparar(urlBanco, "/dados/entrada/cobrancas.json");
        var api = Api.criar(urlBanco);
        String url = Api.subir(api);
        var a = CLIENTE.send(
            pagar(url, "ADM-A", "CB-04", 45000),
            BodyHandlers.ofString()
        );
        var b = CLIENTE.send(
            pagar(url, "ADM-B", "CB-05", 38000),
            BodyHandlers.ofString()
        );
        api.stop(0);
        assertEquals(List.of(201, 201), List.of(a.statusCode(), b.statusCode()));
        assertEquals("CB-04", Api.JSON.readTree(a.body()).get("cobranca").asText());
        assertEquals("CB-05", Api.JSON.readTree(b.body()).get("cobranca").asText());
        assertEquals(2, totalDePagamentos(urlBanco));
    }
}
