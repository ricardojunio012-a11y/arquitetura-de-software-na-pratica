// Etapa 7: a figueira estranguladora. Uma fachada recebe todos os pedidos e decide,
// espaço por espaço, quem responde: o código velho (etapa 6) ou o novo (Novo.java).
// Uso: java morada.etapa7.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
package morada.etapa7;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import morada.etapa5.Reservas;

public class Main {

    // A rota de cada espaço. "experimento": o velho responde e o novo roda junto, só
    // para comparar. A cada fatia validada, um espaço muda de rota; no fim, o velho sai.
    static final Map<String, String> ROTAS = Map.of(
        "salao",
        "novo",
        "churrasqueira",
        "experimento"
    );

    static String rotaDe(JsonNode pedido) {
        return ROTAS.getOrDefault(pedido.get("espaco").asText(), "velho");
    }

    record Resposta(String linha, String email) {}

    static final ObjectMapper JSON = new ObjectMapper();

    // O velho não foi feito para ser chamado assim: recebe um arquivo e grava outro.
    // A fachada se adapta a ele, pelas costuras da etapa 2, sem mudar uma linha dele.
    static Map<String, Resposta> velho(JsonNode dados, LocalDate hoje)
        throws Exception {
        Path pasta = Files.createTempDirectory("velho-");
        Path arquivo = pasta.resolve("pedidos.json");
        JSON.writeValue(arquivo.toFile(), dados);
        List<String> emails = new ArrayList<>();
        var correio = new morada.etapa6.Main.Smtp() {
            @Override
            public void enviar(String para, String texto) {
                emails.add("para " + para + ": " + texto);
            }
        };
        morada.etapa6.Main.processarReservas(
            arquivo.toString(),
            pasta.toString(),
            hoje,
            correio
        );
        List<String> linhas = Files.readAllLines(pasta.resolve("reservas.txt"));
        Map<String, Resposta> respostas = new HashMap<>();
        int i = 0;
        for (JsonNode p : dados.get("pedidos")) {
            respostas.put(
                p.get("id").asText(),
                new Resposta(linhas.get(i), emails.get(i))
            );
            i++;
        }
        return respostas;
    }

    static Map<String, Resposta> novo(JsonNode dados, LocalDate hoje) throws Exception {
        var decisoes = Novo.decidir(
            JSON.treeToValue(dados, Reservas.Dados.class),
            hoje
        );
        List<String> linhas = Reservas.relatorio(decisoes);
        var avisos = Reservas.avisos(decisoes);
        Map<String, Resposta> respostas = new HashMap<>();
        for (int i = 0; i < decisoes.size(); i++) {
            String email =
                "para " + avisos.get(i).para() + ": " + avisos.get(i).texto();
            respostas.put(
                decisoes.get(i).pedido().id(),
                new Resposta(linhas.get(i), email)
            );
        }
        return respostas;
    }

    static JsonNode so(JsonNode dados, Set<String> rotas) {
        ObjectNode copia = dados.deepCopy();
        var pedidos = copia.putArray("pedidos");
        for (JsonNode p : dados.get("pedidos"))
            if (rotas.contains(rotaDe(p))) pedidos.add(p);
        return copia;
    }

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        JsonNode dados = JSON.readTree(Path.of(args[0]).toFile());
        var doVelho = velho(so(dados, Set.of("velho", "experimento")), hoje);
        var doNovo = novo(so(dados, Set.of("novo", "experimento")), hoje);

        // O experimento compara as duas respostas, mas quem responde ao morador é o velho
        List<String> comparados = new ArrayList<>();
        for (JsonNode p : dados.get("pedidos")) {
            if (rotaDe(p).equals("experimento")) comparados.add(p.get("id").asText());
        }
        List<String> divergentes = comparados
            .stream()
            .filter(id -> !doVelho.get(id).equals(doNovo.get(id)))
            .toList();
        System.out.println(
            "experimento: " +
                comparados.size() +
                " pedidos comparados, " +
                divergentes.size() +
                " com divergência"
        );
        for (String id : divergentes) {
            System.out.println(
                "  " +
                    id +
                    ": velho " +
                    doVelho.get(id).linha() +
                    " | novo " +
                    doNovo.get(id).linha()
            );
        }

        List<String> reservas = new ArrayList<>();
        List<String> emails = new ArrayList<>();
        for (JsonNode p : dados.get("pedidos")) {
            var r = (rotaDe(p).equals("novo") ? doNovo : doVelho).get(
                p.get("id").asText()
            );
            reservas.add(r.linha());
            emails.add(r.email());
        }
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("reservas.txt"),
            String.join("\n", reservas) + "\n"
        );
        Files.writeString(
            saida.resolve("emails.txt"),
            String.join("\n", emails) + "\n"
        );
    }
}
