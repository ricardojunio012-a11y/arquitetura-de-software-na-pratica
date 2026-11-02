// Teste de contrato do lado do consumidor. Um dublê responde exatamente o que cada
// interação promete; o cliente real do monólito conversa com ele. Se o cliente
// entende todas as respostas, as interações viram o contrato publicado.
package morada.contrato;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.comunicacao.Api;
import morada.contrato.Interacoes.Interacao;
import morada.monolito.ClienteComunicacao;
import morada.monolito.ClienteComunicacao.Resultado;

public class Consumidor {

    static Interacao atual;

    public static void main(String[] args) throws Exception {
        var json = new ObjectMapper();
        // O dublê do provedor: confere o pedido e devolve a resposta combinada
        var duble = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        duble.createContext("/", troca -> {
            var corpo = json.readTree(troca.getRequestBody());
            var esperado = atual.requisicao();
            boolean igual =
                troca.getRequestMethod().equals(esperado.metodo()) &&
                troca.getRequestURI().getPath().equals(esperado.caminho()) &&
                corpo.equals(json.valueToTree(esperado.corpo()));
            if (igual) Api.responder(
                troca,
                atual.resposta().status(),
                atual.resposta().corpo()
            );
            else Api.responder(troca, 500, Map.of("erro", "pedido inesperado"));
        });
        var cliente = new ClienteComunicacao(Api.subir(duble));

        // O que o monólito precisa entender de cada resposta
        Map<String, Resultado> esperado = Map.of(
            "envio de um aviso novo",
            new Resultado(true, false, null),
            "reenvio de um aviso já enviado",
            new Resultado(true, true, null),
            "aviso sem texto",
            new Resultado(false, false, "texto obrigatório")
        );

        List<String> relatorio = new ArrayList<>();
        for (Interacao interacao : Interacoes.INTERACOES) {
            atual = interacao;
            var corpo = interacao.requisicao().corpo();
            var obtido = cliente.avisar(corpo.get("id"), corpo.get("texto"));
            boolean ok = obtido.equals(esperado.get(interacao.descricao()));
            relatorio.add(
                interacao.descricao() + ": " + (ok ? "o cliente entendeu" : "FALHOU")
            );
        }
        duble.stop(0);

        Map<String, Object> contrato = new LinkedHashMap<>();
        contrato.put("consumidor", "monolito");
        contrato.put("provedor", "comunicacao");
        contrato.put("interacoes", Interacoes.INTERACOES);
        Path pasta = Path.of(args[0], "consumidor");
        Files.createDirectories(pasta);
        Files.writeString(
            pasta.resolve("contrato.json"),
            Interacoes.json(contrato) + "\n"
        );
        Files.writeString(
            pasta.resolve("relatorio.txt"),
            String.join("\n", relatorio) + "\n"
        );
        System.out.println(
            "consumidor: " + Interacoes.INTERACOES.size() + " interações no contrato"
        );
    }
}
