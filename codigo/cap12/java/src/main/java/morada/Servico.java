// O serviço de Comunicação: o mesmo módulo, agora atrás de uma API HTTP, num
// processo e num contêiner próprios. Com FALHAS=sim, falha de propósito: a cada 25
// chamadas recusa o pedido, e a cada 40 envia o aviso mas "perde" a resposta.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Servico {

    static final boolean FALHAR = "sim".equals(System.getenv("FALHAS"));
    static final ObjectMapper JSON = new ObjectMapper();
    static Comunicacao comunicacao = new Comunicacao();
    static int chamadas = 0;

    static void responder(HttpExchange troca, int status, String corpo)
        throws IOException {
        byte[] dados = corpo.getBytes(StandardCharsets.UTF_8);
        troca.getResponseHeaders().set("Content-Type", "application/json");
        troca.sendResponseHeaders(status, dados.length);
        troca.getResponseBody().write(dados);
        troca.close();
    }

    public static void main(String[] args) throws Exception {
        HttpServer servidor = HttpServer.create(new InetSocketAddress(8080), 0);
        servidor.createContext("/saude", troca -> responder(troca, 200, "{}"));
        // Só para o laboratório: começa cada execução do zero
        servidor.createContext("/reiniciar", troca -> {
            comunicacao = new Comunicacao();
            chamadas = 0;
            responder(troca, 200, "{}");
        });
        servidor.createContext("/avisos", troca -> {
            JsonNode aviso = JSON.readTree(troca.getRequestBody());
            chamadas++;
            if (FALHAR && chamadas % 25 == 0) {
                responder(troca, 503, "{\"erro\":\"indisponível\"}");
                return;
            }
            boolean enviado = comunicacao.avisar(
                aviso.get("id").asText(),
                aviso.get("texto").asText()
            );
            if (FALHAR && chamadas % 40 == 0) {
                responder(troca, 503, "{\"erro\":\"tempo esgotado\"}");
                return;
            }
            var resposta = JSON.createObjectNode()
                .put("aviso", aviso.get("id").asText())
                .put("situacao", enviado ? "enviado" : "repetido");
            responder(troca, 200, JSON.writeValueAsString(resposta));
        });
        servidor.start();
        System.out.println("Comunicação ouvindo na porta 8080");
    }
}
