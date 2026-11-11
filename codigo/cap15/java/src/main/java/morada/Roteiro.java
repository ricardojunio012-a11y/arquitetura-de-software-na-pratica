// A versão "api": prepara o banco, sobe a API, envia as requisições do roteiro e
// confere cada resposta contra o contrato openapi/v1.yaml.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import morada.api.Api;
import morada.api.Banco;
import morada.contrato.OpenApi;
import morada.contrato.Validar;

public class Roteiro {

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        String urlBanco = System.getenv("BANCO_URL");
        Banco.preparar(urlBanco, dados.resolve("entrada/cobrancas.json").toString());
        JsonNode contrato = OpenApi.ler(dados.resolve("openapi/v1.yaml").toString());
        JsonNode requisicoes = Api.JSON.readTree(
            dados.resolve("entrada/requisicoes.json").toFile()
        );
        var api = Api.criar(urlBanco);
        String url = Api.subir(api);
        var cliente = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .build();

        List<String> respostas = new ArrayList<>();
        List<String> divergencias = new ArrayList<>();
        int i = 0;
        for (JsonNode r : requisicoes) {
            String metodo = r.get("metodo").asText();
            String caminho = r.get("caminho").asText();
            var pedido = HttpRequest.newBuilder(URI.create(url + caminho))
                .header("Content-Type", "application/json")
                .method(
                    metodo,
                    r.has("corpo")
                        ? BodyPublishers.ofString(Api.paraJson(r.get("corpo")))
                        : BodyPublishers.noBody()
                );
            // Quem chama (no lugar do token de acesso) e a chave de idempotência
            List<String> extras = new ArrayList<>();
            if (r.has("administradora")) {
                String administradora = r.get("administradora").asText();
                pedido.header("Morada-Administradora", administradora);
                extras.add("Morada-Administradora: " + administradora);
            }
            if (r.has("chave")) {
                pedido.header("Idempotency-Key", r.get("chave").asText());
                extras.add("Idempotency-Key: " + r.get("chave").asText());
            }
            var resposta = cliente.send(pedido.build(), BodyHandlers.ofString());
            String tipo = resposta.headers().firstValue("Content-Type").orElse("");
            JsonNode corpo = Api.JSON.readTree(resposta.body());
            String lista = extras.isEmpty()
                ? ""
                : " (" + String.join(", ", extras) + ")";
            respostas.add(++i + ". " + r.get("descricao").asText());
            respostas.add("   " + metodo + " " + caminho + lista);
            if (r.has("corpo")) respostas.add("   " + Api.paraJson(r.get("corpo")));
            respostas.add("   → " + resposta.statusCode() + " " + tipo);
            respostas.add("   " + Api.paraJson(corpo));
            respostas.add("");
            String semConsulta = URI.create(url + caminho).getPath();
            divergencias.addAll(
                Validar.validarResposta(
                    contrato,
                    metodo,
                    semConsulta,
                    resposta.statusCode(),
                    tipo,
                    corpo
                )
            );
        }
        api.stop(0);

        List<String> estado = new ArrayList<>();
        try (var banco = Banco.conectar(urlBanco); var sql = banco.createStatement()) {
            var pagamentos = sql.executeQuery(
                "SELECT id, cobranca, valor_centavos FROM pagamentos ORDER BY id"
            );
            List<String> linhas = new ArrayList<>();
            while (pagamentos.next()) {
                linhas.add(
                    "  " +
                        pagamentos.getString(1) +
                        ": cobrança " +
                        pagamentos.getString(2) +
                        ", " +
                        pagamentos.getInt(3) +
                        " centavos"
                );
            }
            estado.add("pagamentos registrados: " + linhas.size());
            estado.addAll(linhas);
            var pagas = sql.executeQuery(
                "SELECT id FROM cobrancas WHERE situacao = 'paga' ORDER BY id"
            );
            List<String> ids = new ArrayList<>();
            while (pagas.next()) ids.add(pagas.getString(1));
            estado.add("cobranças pagas: " + String.join(", ", ids));
            var chaves = sql.executeQuery(
                """
                SELECT administradora, string_agg(chave, ', ' ORDER BY chave)
                FROM chaves_idempotencia GROUP BY administradora ORDER BY administradora"""
            );
            estado.add("chaves de idempotência guardadas:");
            while (chaves.next()) {
                estado.add("  " + chaves.getString(1) + ": " + chaves.getString(2));
            }
        }
        List<String> conferencia = new ArrayList<>();
        conferencia.add(
            requisicoes.size() + " respostas conferidas com openapi/v1.yaml"
        );
        conferencia.addAll(
            divergencias.isEmpty() ? List.of("nenhuma divergência") : divergencias
        );

        Path saida = dados.resolve("saida/api");
        Files.createDirectories(saida);
        Files.writeString(saida.resolve("respostas.txt"), String.join("\n", respostas));
        Files.writeString(
            saida.resolve("estado.txt"),
            String.join("\n", estado) + "\n"
        );
        Files.writeString(
            saida.resolve("contrato.txt"),
            String.join("\n", conferencia) + "\n"
        );
        System.out.println(
            "api: " +
                requisicoes.size() +
                " requisições, " +
                divergencias.size() +
                " divergências"
        );
    }
}
