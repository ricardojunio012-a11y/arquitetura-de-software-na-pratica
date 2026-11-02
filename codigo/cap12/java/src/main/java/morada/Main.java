// Uso: java morada.Main monolito|servico <pasta-de-saída>
// Envia um aviso por pagamento confirmado: pelo módulo, no mesmo processo, ou pelo
// serviço extraído, pela rede. Conta o que aconteceu e mede o tempo de cada aviso.
package morada;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Main {

    static final ObjectMapper JSON = new ObjectMapper();
    // HTTP/1.1, como os clientes das outras linguagens (sem tentativa de HTTP/2)
    static final HttpClient CLIENTE = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();
    static final String URL = System.getenv("COMUNICACAO_URL");
    static int enviados, chamadas, erros, novasTentativas, repetidos, perdidos;

    static int post(String endereco, Map<String, String> corpo, String[] situacao) {
        try {
            var pedido = HttpRequest.newBuilder(URI.create(endereco))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(2))
                .POST(BodyPublishers.ofString(JSON.writeValueAsString(corpo)))
                .build();
            var resposta = CLIENTE.send(pedido, BodyHandlers.ofString());
            if (resposta.statusCode() == 200 && situacao != null) {
                situacao[0] = JSON.readTree(resposta.body()).path("situacao").asText();
            }
            return resposta.statusCode();
        } catch (Exception erro) {
            return 0;
        }
    }

    // Pela rede, cada chamada pode falhar: tenta até 3 vezes, sempre com o mesmo id
    static void enviarPelaRede(String id, String texto) {
        for (int tentativa = 1; tentativa <= 3; tentativa++) {
            if (tentativa > 1) {
                novasTentativas++;
                // Espera crescente (de 5 a 10 ms, depois de 10 a 20 ms), com variação,
                // para que clientes que falharam juntos não voltem todos no mesmo instante
                double teto = 10 * Math.pow(2, tentativa - 2);
                long ms = Math.round(teto / 2 + Math.random() * (teto / 2));
                try {
                    Thread.sleep(ms);
                } catch (InterruptedException erro) {
                    Thread.currentThread().interrupt();
                }
            }
            chamadas++;
            String[] situacao = new String[1];
            int status = post(
                URL + "/avisos",
                Map.of("id", id, "texto", texto),
                situacao
            );
            if (status == 200) {
                if ("repetido".equals(situacao[0])) repetidos++;
                enviados++;
                return;
            }
            erros++;
        }
        perdidos++;
    }

    public static void main(String[] args) throws Exception {
        String versao = args[0];
        int avisos = JSON.readTree(Path.of("/dados/entrada/carga.json").toFile())
            .get("avisos")
            .asInt();
        var modulo = new Comunicacao();
        if (versao.equals("servico")) post(URL + "/reiniciar", Map.of(), null);
        List<Double> tempos = new ArrayList<>();
        long inicio = System.nanoTime();
        for (int i = 1; i <= avisos; i++) {
            String id = String.format("E-P-%03d", i);
            String texto = "pagamento " + id.substring(2) + " recebido";
            long t0 = System.nanoTime();
            if (versao.equals("servico")) enviarPelaRede(id, texto);
            else if (modulo.avisar(id, texto)) enviados++;
            tempos.add((System.nanoTime() - t0) / 1e6);
        }
        double total = (System.nanoTime() - inicio) / 1e6;

        Path saida = Path.of(args[1]);
        Files.createDirectories(saida.resolve(versao));
        Files.writeString(
            saida.resolve(versao).resolve("resultado.txt"),
            String.join(
                "\n",
                "avisos enviados: " + enviados,
                "chamadas pela rede: " + chamadas,
                "respostas com erro: " + erros,
                "novas tentativas: " + novasTentativas,
                "avisos repetidos ignorados: " + repetidos,
                "avisos perdidos: " + perdidos
            ) + "\n"
        );
        // Os tempos variam de máquina para máquina: ficam fora da pasta verificada
        List<Double> ordenados = tempos.stream().sorted().toList();
        double media = tempos
            .stream()
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0);
        Files.writeString(
            saida.resolve("tempos-" + versao + ".txt"),
            String.format(
                java.util.Locale.ROOT,
                "tempo médio por aviso: %.3f ms%np95 por aviso: %.3f ms%n" +
                    "pior aviso: %.3f ms%ntempo total: %.3f ms%n",
                media,
                ordenados.get((int) (ordenados.size() * 0.95)),
                ordenados.get(ordenados.size() - 1),
                total
            )
        );
        System.out.println(versao + ": " + enviados + " avisos; saída em " + saida);
    }
}
