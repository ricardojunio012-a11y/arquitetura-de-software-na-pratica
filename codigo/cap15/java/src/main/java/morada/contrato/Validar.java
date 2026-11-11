// Confere uma resposta real contra o contrato: o status precisa estar documentado, o
// tipo de conteúdo também, e o corpo precisa seguir o esquema.
package morada.contrato;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class Validar {

    private Validar() {}

    static String tipoDe(JsonNode valor) {
        if (valor.isNull()) return "null";
        if (valor.isBoolean()) return "boolean";
        if (valor.isIntegralNumber()) return "integer";
        if (valor.isNumber()) return "number";
        if (valor.isTextual()) return "string";
        if (valor.isArray()) return "array";
        return "object";
    }

    static List<String> tipos(JsonNode esquema) {
        List<String> tipos = new ArrayList<>();
        JsonNode tipo = esquema.get("type");
        if (tipo == null) return tipos;
        if (tipo.isArray()) tipo.forEach(t -> tipos.add(t.asText()));
        else tipos.add(tipo.asText());
        return tipos;
    }

    static boolean contem(JsonNode lista, JsonNode valor) {
        for (JsonNode item : lista) if (item.equals(valor)) return true;
        return false;
    }

    static List<String> validarEsquema(
        JsonNode contrato,
        JsonNode esquema,
        JsonNode valor,
        String onde
    ) {
        esquema = OpenApi.resolver(contrato, esquema);
        List<String> tipos = tipos(esquema);
        String tipo = tipoDe(valor);
        if (!tipos.isEmpty() && !tipos.contains(tipo)) {
            return List.of(
                onde + ": esperado " + String.join(" ou ", tipos) + ", recebido " + tipo
            );
        }
        if (esquema.has("enum") && !contem(esquema.get("enum"), valor)) {
            return List.of(onde + ": valor fora do enum: " + valor.asText());
        }
        List<String> erros = new ArrayList<>();
        if (tipo.equals("object")) {
            for (JsonNode campo : esquema.path("required")) {
                if (!valor.has(campo.asText())) {
                    erros.add(
                        onde + "." + campo.asText() + ": campo obrigatório ausente"
                    );
                }
            }
            for (Map.Entry<String, JsonNode> campo : esquema
                .path("properties")
                .properties()) {
                String nome = campo.getKey();
                if (valor.has(nome)) {
                    String dentro = onde + "." + nome;
                    erros.addAll(
                        validarEsquema(
                            contrato,
                            campo.getValue(),
                            valor.get(nome),
                            dentro
                        )
                    );
                }
            }
        }
        if (tipo.equals("array") && esquema.has("items")) {
            for (int i = 0; i < valor.size(); i++) {
                String dentro = onde + "[" + i + "]";
                erros.addAll(
                    validarEsquema(contrato, esquema.get("items"), valor.get(i), dentro)
                );
            }
        }
        return erros;
    }

    public static List<String> validarResposta(
        JsonNode contrato,
        String metodo,
        String caminho,
        int status,
        String tipo,
        JsonNode corpo
    ) {
        String modelo = OpenApi.encontrarCaminho(contrato, caminho);
        JsonNode operacao =
            modelo == null
                ? null
                : contrato.get("paths").get(modelo).get(metodo.toLowerCase());
        if (operacao == null) return List.of(
            metodo + " " + caminho + ": operação fora do contrato"
        );
        String nome = metodo + " " + modelo + " " + status;
        JsonNode resposta = OpenApi.resolver(
            contrato,
            operacao.get("responses").get(String.valueOf(status))
        );
        if (resposta == null) return List.of(nome + ": status não documentado");
        JsonNode conteudo = resposta.path("content").get(tipo);
        if (conteudo == null) {
            return List.of(nome + ": tipo de conteúdo não documentado: " + tipo);
        }
        return validarEsquema(contrato, conteudo.get("schema"), corpo, "$")
            .stream()
            .map(erro -> nome + ": " + erro)
            .toList();
    }
}
