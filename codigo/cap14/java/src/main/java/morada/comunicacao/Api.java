// A API HTTP do serviço de Comunicação: o provedor do contrato.
package morada.comunicacao;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.Map;
import morada.comunicacao.Comunicacao.DadosInvalidosErro;

public class Api {

    static final ObjectMapper JSON = new ObjectMapper();

    static {
        // Sem isso, o servidor HTTP do JDK atrasa as respostas (capítulo 12)
        System.setProperty("sun.net.httpserver.nodelay", "true");
    }

    public static void responder(HttpExchange troca, int status, Object corpo)
        throws IOException {
        byte[] dados = JSON.writeValueAsBytes(corpo);
        troca.getResponseHeaders().set("Content-Type", "application/json");
        troca.sendResponseHeaders(status, dados.length);
        troca.getResponseBody().write(dados);
        troca.close();
    }

    public static HttpServer criar(Comunicacao comunicacao) throws IOException {
        var servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/avisos", troca -> {
            JsonNode aviso = JSON.readTree(troca.getRequestBody());
            String id = aviso.get("id").asText();
            try {
                String situacao = comunicacao.avisar(id, aviso.get("texto").asText());
                responder(troca, 200, Map.of("aviso", id, "situacao", situacao));
            } catch (DadosInvalidosErro erro) {
                responder(troca, 400, Map.of("erro", erro.getMessage()));
            }
        });
        return servidor;
    }

    // Sobe o servidor e devolve o endereço
    public static String subir(HttpServer servidor) {
        servidor.start();
        return "http://127.0.0.1:" + servidor.getAddress().getPort();
    }
}
