// Testes do contrato. O primeiro é o que quebra o build quando alguém muda
// openapi/v1.yaml de um jeito que os clientes atuais não aguentam. Na construção da
// imagem os contratos não estão montados, e por isso os testes são pulados.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import morada.api.Api;
import morada.contrato.Compatibilidade;
import morada.contrato.OpenApi;
import morada.contrato.Validar;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ContratoTest {

    @BeforeEach
    void precisaDosContratos() {
        assumeTrue(Files.exists(Path.of("/dados/openapi/v1.yaml")), "sem contratos");
    }

    static List<String> quebras(JsonNode antigo, JsonNode novo) {
        return Compatibilidade.comparar(antigo, novo)
            .stream()
            .filter(m -> !m.compativel())
            .map(Compatibilidade.Mudanca::texto)
            .toList();
    }

    @Test
    void oContratoAtualECompativelComOPublicado() throws Exception {
        JsonNode publicado = OpenApi.ler("/dados/openapi/publicado/v1.yaml");
        JsonNode atual = OpenApi.ler("/dados/openapi/v1.yaml");
        assertEquals(List.of(), quebras(publicado, atual));
    }

    @Test
    void renomearUmCampoDaRespostaEIncompativel() throws Exception {
        JsonNode publicado = OpenApi.ler("/dados/openapi/publicado/v1.yaml");
        JsonNode proposta = OpenApi.ler("/dados/entrada/propostas/b-renomear.yaml");
        assertEquals(
            List.of(
                "GET /v1/condominios/{condominio}/cobrancas 200: " +
                    "campo removido: dados[].valorCentavos"
            ),
            quebras(publicado, proposta)
        );
    }

    @Test
    void umaRespostaComOTipoErradoNaoPassaNaConferencia() throws Exception {
        JsonNode corpo = Api.JSON.readTree(
            """
            {"dados": [{"id": "CB-02", "unidade": "102", "vencimento": "2026-10-10",
              "valorCentavos": "450,00", "situacao": "aberta"}], "proximo": null}"""
        );
        JsonNode atual = OpenApi.ler("/dados/openapi/v1.yaml");
        String caminho = "/v1/condominios/C-01/cobrancas";
        assertEquals(
            List.of(
                "GET /v1/condominios/{condominio}/cobrancas 200: " +
                    "$.dados[0].valorCentavos: esperado integer, recebido string"
            ),
            Validar.validarResposta(
                atual,
                "GET",
                caminho,
                200,
                "application/json",
                corpo
            )
        );
    }
}
