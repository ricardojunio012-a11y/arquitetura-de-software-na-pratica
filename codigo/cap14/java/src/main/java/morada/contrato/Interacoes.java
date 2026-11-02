// As interações que o consumidor (o monólito) espera do provedor (a Comunicação).
// Cada uma diz o estado em que o provedor deve estar, o pedido e a resposta.
package morada.contrato;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Interacoes {

    private Interacoes() {}

    public record Requisicao(
        String metodo,
        String caminho,
        Map<String, String> corpo
    ) {}

    public record Resposta(int status, Map<String, String> corpo) {}

    public record Interacao(
        String descricao,
        String estado,
        Requisicao requisicao,
        Resposta resposta
    ) {}

    static Map<String, String> mapa(String... pares) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < pares.length; i += 2) m.put(pares[i], pares[i + 1]);
        return m;
    }

    static final Requisicao AVISO = new Requisicao(
        "POST",
        "/avisos",
        mapa("id", "E-P-001", "texto", "pagamento recebido")
    );

    public static final List<Interacao> INTERACOES = List.of(
        new Interacao(
            "envio de um aviso novo",
            "nenhum aviso foi enviado",
            AVISO,
            new Resposta(200, mapa("aviso", "E-P-001", "situacao", "enviado"))
        ),
        new Interacao(
            "reenvio de um aviso já enviado",
            "o aviso E-P-001 já foi enviado",
            AVISO,
            new Resposta(200, mapa("aviso", "E-P-001", "situacao", "repetido"))
        ),
        new Interacao(
            "aviso sem texto",
            "nenhum aviso foi enviado",
            new Requisicao("POST", "/avisos", mapa("id", "E-P-002", "texto", "")),
            new Resposta(400, mapa("erro", "texto obrigatório"))
        )
    );

    // JSON com dois espaços de recuo e "chave": valor, igual ao das outras linguagens
    public static String json(Object dados) throws Exception {
        var recuo = new DefaultIndenter("  ", "\n");
        var impressora = new DefaultPrettyPrinter().withSeparators(
            Separators.createDefaultInstance().withObjectFieldValueSpacing(
                Separators.Spacing.AFTER
            )
        );
        impressora.indentObjectsWith(recuo);
        impressora.indentArraysWith(recuo);
        return new ObjectMapper().writer(impressora).writeValueAsString(dados);
    }
}
