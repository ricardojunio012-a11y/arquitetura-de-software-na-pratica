// A versão "barulho": um servidor atende um pedido por vez, em ordem de chegada, e
// cada pedido leva servicoMs. Sem limite, a rajada de um condomínio enche a fila e
// atrasa todos. Com um balde de fichas por condomínio, a rajada é recusada (429) e os
// outros quase não esperam. O tempo é simulado, e o resultado é sempre o mesmo.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class Barulho {

    record Pedido(int t, int condominio) {}

    static List<String> simular(List<Pedido> pedidos, int servicoMs, JsonNode limite) {
        Map<Integer, Integer> recusados = new TreeMap<>();
        Map<Integer, List<Integer>> esperas = new TreeMap<>();
        Map<Integer, BaldeDeFichas> baldes = new TreeMap<>();
        int livreEm = 0;
        for (Pedido p : pedidos) {
            recusados.putIfAbsent(p.condominio(), 0);
            esperas.putIfAbsent(p.condominio(), new ArrayList<>());
            if (limite != null) {
                var balde = baldes.computeIfAbsent(p.condominio(), c ->
                    new BaldeDeFichas(
                        limite.get("rajada").asInt(),
                        limite.get("porSegundo").asInt()
                    )
                );
                if (!balde.permite(p.t())) {
                    recusados.merge(p.condominio(), 1, Integer::sum);
                    continue;
                }
            }
            // O pedido espera o servidor terminar o que chegou antes dele
            int inicio = Math.max(p.t(), livreEm);
            esperas.get(p.condominio()).add(inicio - p.t());
            livreEm = inicio + servicoMs;
        }
        List<String> linhas = new ArrayList<>();
        for (var e : esperas.entrySet()) {
            List<Integer> lista = e.getValue();
            int soma = lista.stream().mapToInt(Integer::intValue).sum();
            int media = lista.isEmpty() ? 0 : soma / lista.size();
            int maxima = lista.stream().mapToInt(Integer::intValue).max().orElse(0);
            int recusas = recusados.get(e.getKey());
            linhas.add(
                "condomínio " +
                    e.getKey() +
                    ": " +
                    (lista.size() + recusas) +
                    " pedidos, " +
                    lista.size() +
                    " atendidos, " +
                    recusas +
                    " recusados, " +
                    "espera média " +
                    media +
                    " ms, máxima " +
                    maxima +
                    " ms"
            );
        }
        return linhas;
    }

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        JsonNode cenario = new ObjectMapper().readTree(
            dados.resolve("entrada/barulho.json").toFile()
        );
        int duracao = cenario.get("duracaoMs").asInt();
        List<Pedido> pedidos = new ArrayList<>();
        for (JsonNode c : cenario.get("clientes")) {
            for (
                int t = c.get("inicioMs").asInt();
                t < duracao;
                t += c.get("intervaloMs").asInt()
            ) {
                pedidos.add(new Pedido(t, c.get("condominio").asInt()));
            }
        }
        pedidos.sort(
            Comparator.comparingInt(Pedido::t).thenComparingInt(Pedido::condominio)
        );

        int servico = cenario.get("servicoMs").asInt();
        JsonNode limite = cenario.get("limite");
        List<String> resultado = new ArrayList<>();
        resultado.add("== sem limite");
        resultado.addAll(simular(pedidos, servico, null));
        resultado.add("");
        resultado.add(
            "== com limite por condomínio (rajada de " +
                limite.get("rajada").asInt() +
                ", " +
                limite.get("porSegundo").asInt() +
                " por segundo)"
        );
        resultado.addAll(simular(pedidos, servico, limite));

        Path saida = dados.resolve("saida/barulho");
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("resultado.txt"),
            String.join("\n", resultado) + "\n"
        );
        System.out.println("barulho: " + pedidos.size() + " pedidos simulados");
    }
}
