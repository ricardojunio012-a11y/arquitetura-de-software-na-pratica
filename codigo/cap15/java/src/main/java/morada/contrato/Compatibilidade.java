// Compara o contrato publicado com uma proposta e lista as mudanças. Incompatível é
// o que pode quebrar um cliente que já funciona: tirar algo que ele usa, mudar o que
// ele recebe ou exigir algo que ele não envia.
package morada.contrato;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Compatibilidade {

    public record Mudanca(boolean compativel, String texto) {}

    private final JsonNode antigo;
    private final JsonNode novo;
    private final List<Mudanca> mudancas = new ArrayList<>();

    private Compatibilidade(JsonNode antigo, JsonNode novo) {
        this.antigo = antigo;
        this.novo = novo;
    }

    void anotar(boolean compativel, String texto) {
        mudancas.add(new Mudanca(compativel, texto));
    }

    static List<String> textos(JsonNode lista) {
        List<String> valores = new ArrayList<>();
        lista.forEach(v -> valores.add(v.asText()));
        return valores;
    }

    void esquemas(JsonNode a, JsonNode b, String lado, String rotulo, String campo) {
        a = OpenApi.resolver(antigo, a);
        b = OpenApi.resolver(novo, b);
        String nome = campo.isEmpty() ? "(raiz)" : campo;
        String tipoA = String.join(" ou ", Validar.tipos(a));
        String tipoB = String.join(" ou ", Validar.tipos(b));
        if (!tipoA.equals(tipoB)) {
            anotar(
                false,
                rotulo + ": tipo mudou: " + nome + " (" + tipoA + " → " + tipoB + ")"
            );
            return;
        }
        if (a.has("enum") && b.has("enum")) {
            // Valor novo na resposta quebra quem trata todos os casos; valor a menos no
            // pedido quebra quem o envia
            boolean resposta = lado.equals("resposta");
            List<String> de = textos(resposta ? a.get("enum") : b.get("enum"));
            List<String> para = textos(resposta ? b.get("enum") : a.get("enum"));
            String aviso = resposta ? "valor novo no enum" : "valor removido do enum";
            for (String valor : para) {
                if (!de.contains(valor)) {
                    anotar(false, rotulo + ": " + aviso + ": " + nome + " = " + valor);
                }
            }
        }
        JsonNode propsA = a.path("properties");
        JsonNode propsB = b.path("properties");
        List<String> obrigA = textos(a.path("required"));
        List<String> obrigB = textos(b.path("required"));
        for (Map.Entry<String, JsonNode> p : propsA.properties()) {
            String nomeP = p.getKey();
            String dentro = campo.isEmpty() ? nomeP : campo + "." + nomeP;
            if (!propsB.has(nomeP)) {
                anotar(false, rotulo + ": campo removido: " + dentro);
                continue;
            }
            boolean garantidoAntes = obrigA.contains(nomeP);
            boolean garantidoDepois = obrigB.contains(nomeP);
            if (lado.equals("resposta") && garantidoAntes && !garantidoDepois) {
                anotar(false, rotulo + ": campo deixou de ser garantido: " + dentro);
            }
            if (lado.equals("pedido") && !garantidoAntes && garantidoDepois) {
                anotar(false, rotulo + ": campo passou a ser obrigatório: " + dentro);
            }
            esquemas(p.getValue(), propsB.get(nomeP), lado, rotulo, dentro);
        }
        for (Map.Entry<String, JsonNode> p : propsB.properties()) {
            String nomeP = p.getKey();
            if (propsA.has(nomeP)) continue;
            String dentro = campo.isEmpty() ? nomeP : campo + "." + nomeP;
            if (lado.equals("resposta")) anotar(
                true,
                rotulo + ": campo novo: " + dentro
            );
            else if (obrigB.contains(nomeP)) {
                anotar(false, rotulo + ": campo novo obrigatório: " + dentro);
            } else anotar(true, rotulo + ": campo novo opcional: " + dentro);
        }
        if (a.has("items") && b.has("items")) {
            esquemas(a.get("items"), b.get("items"), lado, rotulo, campo + "[]");
        }
    }

    static String chave(JsonNode parametro) {
        return parametro.get("in").asText() + " " + parametro.get("name").asText();
    }

    void parametros(JsonNode a, JsonNode b, String nome) {
        Map<String, JsonNode> novos = new LinkedHashMap<>();
        b.forEach(p -> novos.put(chave(p), p));
        List<String> antigos = new ArrayList<>();
        for (JsonNode pa : a) {
            antigos.add(chave(pa));
            String nomeP = pa.get("name").asText();
            JsonNode pb = novos.get(chave(pa));
            if (pb == null) {
                anotar(false, nome + ": parâmetro removido: " + nomeP);
                continue;
            }
            if (!pa.path("required").asBoolean() && pb.path("required").asBoolean()) {
                String texto = "parâmetro passou a ser obrigatório: " + nomeP;
                anotar(false, nome + ": " + texto);
            }
            String rotulo = nome + " parâmetro " + nomeP;
            esquemas(pa.get("schema"), pb.get("schema"), "pedido", rotulo, "");
        }
        for (JsonNode pb : b) {
            if (antigos.contains(chave(pb))) continue;
            String nomeP = pb.get("name").asText();
            if (pb.path("required").asBoolean()) {
                anotar(false, nome + ": parâmetro obrigatório novo: " + nomeP);
            } else anotar(true, nome + ": parâmetro opcional novo: " + nomeP);
        }
    }

    void operacao(JsonNode a, JsonNode b, String nome) {
        parametros(a.path("parameters"), b.path("parameters"), nome);
        JsonNode pedidoA = a.at("/requestBody/content/application~1json/schema");
        JsonNode pedidoB = b.at("/requestBody/content/application~1json/schema");
        if (!pedidoA.isMissingNode() && !pedidoB.isMissingNode()) {
            esquemas(pedidoA, pedidoB, "pedido", nome + " pedido", "");
        }
        for (Map.Entry<String, JsonNode> r : a.get("responses").properties()) {
            String status = r.getKey();
            if (!b.get("responses").has(status)) continue;
            JsonNode conteudoA = conteudo(antigo, r.getValue());
            JsonNode conteudoB = conteudo(novo, b.get("responses").get(status));
            for (Map.Entry<String, JsonNode> meio : conteudoA.properties()) {
                if (!conteudoB.has(meio.getKey())) continue;
                JsonNode esquemaB = conteudoB.get(meio.getKey()).get("schema");
                esquemas(
                    meio.getValue().get("schema"),
                    esquemaB,
                    "resposta",
                    nome + " " + status,
                    ""
                );
            }
        }
    }

    static JsonNode conteudo(JsonNode contrato, JsonNode resposta) {
        JsonNode resolvida = OpenApi.resolver(contrato, resposta);
        return resolvida.has("content")
            ? resolvida.get("content")
            : MissingNode.getInstance();
    }

    public static List<Mudanca> comparar(JsonNode antigo, JsonNode novo) {
        var c = new Compatibilidade(antigo, novo);
        for (Map.Entry<String, JsonNode> caminho : antigo.get("paths").properties()) {
            for (Map.Entry<String, JsonNode> op : caminho.getValue().properties()) {
                String nome = op.getKey().toUpperCase() + " " + caminho.getKey();
                JsonNode opNova = novo
                    .get("paths")
                    .path(caminho.getKey())
                    .get(op.getKey());
                if (opNova != null) c.operacao(op.getValue(), opNova, nome);
                else c.anotar(false, nome + ": operação removida");
            }
        }
        for (Map.Entry<String, JsonNode> caminho : novo.get("paths").properties()) {
            for (Map.Entry<String, JsonNode> op : caminho.getValue().properties()) {
                if (
                    antigo.get("paths").path(caminho.getKey()).get(op.getKey()) == null
                ) {
                    String nome = op.getKey().toUpperCase() + " " + caminho.getKey();
                    c.anotar(true, nome + ": operação nova");
                }
            }
        }
        return c.mudancas;
    }
}
