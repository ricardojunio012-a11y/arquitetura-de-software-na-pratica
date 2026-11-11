// A API pública do Morada para administradoras. Os erros seguem a RFC 9457 (problem
// details), a listagem é paginada por cursor e o pagamento exige uma chave de
// idempotência no cabeçalho Idempotency-Key. Cada administradora só enxerga os
// condomínios que administra.
package morada.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

public class Api {

    public static final ObjectMapper JSON = new ObjectMapper();
    static final String PROBLEMAS = "https://api.morada.example/problemas/";
    static final String PEDIR_CHAVE =
        "envie o cabeçalho Idempotency-Key com um identificador único do pedido";
    static final Pattern ROTA_COBRANCAS = Pattern.compile(
        "^/v1/condominios/([^/]+)/cobrancas$"
    );

    static {
        // Sem isso, o servidor HTTP do JDK atrasa as respostas (capítulo 12)
        System.setProperty("sun.net.httpserver.nodelay", "true");
    }

    public record Resposta(int status, JsonNode corpo) {}

    static class Problema extends Exception {

        final int status;
        final String tipo;
        final String titulo;

        Problema(int status, String tipo, String titulo, String detalhe) {
            super(detalhe);
            this.status = status;
            this.tipo = tipo;
            this.titulo = titulo;
        }

        Resposta resposta() {
            ObjectNode corpo = JSON.createObjectNode();
            corpo.put("type", PROBLEMAS + tipo);
            corpo.put("title", titulo);
            corpo.put("status", status);
            corpo.put("detail", getMessage());
            return new Resposta(status, corpo);
        }
    }

    public static String paraJson(Object dados) {
        try {
            return JSON.writeValueAsString(dados);
        } catch (IOException erro) {
            throw new IllegalStateException(erro);
        }
    }

    // O cursor é opaco para o cliente: o último identificador da página, em
    // base64url
    static String cursorDe(String id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(id.getBytes());
    }

    static String idDoCursor(String cursor) {
        return new String(Base64.getUrlDecoder().decode(cursor));
    }

    static Resposta listarCobrancas(
        Connection banco,
        String administradora,
        String condominio,
        Map<String, String> consulta
    ) throws SQLException, Problema {
        String recebido = consulta.getOrDefault("limite", "20");
        int limite = recebido.matches("\\d{1,9}") ? Integer.parseInt(recebido) : 0;
        if (limite < 1 || limite > 100) {
            throw new Problema(
                400,
                "limite-invalido",
                "Limite inválido",
                "limite deve estar entre 1 e 100, recebido " + recebido
            );
        }
        String situacao = consulta.get("situacao");
        if (situacao != null && !List.of("aberta", "paga").contains(situacao)) {
            throw new Problema(
                400,
                "situacao-invalida",
                "Situação inválida",
                "situação deve ser aberta ou paga, recebido " + situacao
            );
        }
        // Autorização por objeto: o condomínio de outra administradora responde como
        // se não existisse, para não revelar nem que ele existe
        var existe = banco.prepareStatement(
            "SELECT 1 FROM condominios WHERE id = ? AND administradora = ?"
        );
        existe.setString(1, condominio);
        existe.setString(2, administradora);
        if (!existe.executeQuery().next()) {
            throw new Problema(
                404,
                "condominio-inexistente",
                "Condomínio não encontrado",
                "não existe o condomínio " + condominio
            );
        }
        String cursor = consulta.get("cursor");
        String depoisDe = cursor != null ? idDoCursor(cursor) : "";
        // Uma linha a mais que o limite diz se existe a próxima página
        var sql = banco.prepareStatement(
            """
            SELECT id, unidade, vencimento::text, valor_centavos, situacao
            FROM cobrancas
            WHERE condominio = ? AND (?::text IS NULL OR situacao = ?) AND id > ?
            ORDER BY id LIMIT ?"""
        );
        sql.setString(1, condominio);
        sql.setString(2, situacao);
        sql.setString(3, situacao);
        sql.setString(4, depoisDe);
        sql.setInt(5, limite + 1);
        var linhas = sql.executeQuery();
        var dados = JSON.createArrayNode();
        boolean haMais = false;
        while (linhas.next()) {
            if (dados.size() == limite) {
                haMais = true;
                break;
            }
            ObjectNode c = dados.addObject();
            c.put("id", linhas.getString(1));
            c.put("unidade", linhas.getString(2));
            c.put("vencimento", linhas.getString(3));
            c.put("valorCentavos", linhas.getInt(4));
            c.put("situacao", linhas.getString(5));
        }
        ObjectNode pagina = JSON.createObjectNode();
        pagina.set("dados", dados);
        String ultimo = dados.isEmpty()
            ? null
            : dados
                  .get(dados.size() - 1)
                  .get("id")
                  .asText();
        pagina.put("proximo", haMais ? cursorDe(ultimo) : null);
        return new Resposta(200, pagina);
    }

    // As regras do pagamento, dentro da transação aberta por registrarPagamento
    static Resposta pagar(
        Connection banco,
        String administradora,
        String cobranca,
        int valor
    ) throws SQLException, Problema {
        // A cobrança precisa ser de um condomínio da própria administradora
        var consulta = banco.prepareStatement(
            """
            SELECT valor_centavos, situacao FROM cobrancas
            WHERE id = ? AND condominio IN
              (SELECT id FROM condominios WHERE administradora = ?)
            FOR UPDATE"""
        );
        consulta.setString(1, cobranca);
        consulta.setString(2, administradora);
        var linha = consulta.executeQuery();
        if (!linha.next()) {
            throw new Problema(
                422,
                "cobranca-inexistente",
                "Cobrança não encontrada",
                "não existe a cobrança " + cobranca
            );
        }
        if (linha.getString("situacao").equals("paga")) {
            throw new Problema(
                409,
                "cobranca-paga",
                "Cobrança já paga",
                "a cobrança " + cobranca + " já foi paga"
            );
        }
        int devido = linha.getInt("valor_centavos");
        if (devido != valor) {
            throw new Problema(
                422,
                "valor-divergente",
                "Valor divergente",
                "a cobrança " +
                    cobranca +
                    " vale " +
                    devido +
                    " centavos, e o pagamento informou " +
                    valor
            );
        }
        var sequencia = banco
            .createStatement()
            .executeQuery(
                "SELECT 'PG-' || lpad(nextval('pagamentos_seq')::text, 4, '0')"
            );
        sequencia.next();
        String id = sequencia.getString(1);
        var pagamento = banco.prepareStatement(
            "INSERT INTO pagamentos VALUES (?, ?, ?)"
        );
        pagamento.setString(1, id);
        pagamento.setString(2, cobranca);
        pagamento.setInt(3, valor);
        pagamento.executeUpdate();
        var paga = banco.prepareStatement(
            "UPDATE cobrancas SET situacao = 'paga' WHERE id = ?"
        );
        paga.setString(1, cobranca);
        paga.executeUpdate();
        ObjectNode corpo = JSON.createObjectNode();
        corpo.put("id", id);
        corpo.put("cobranca", cobranca);
        corpo.put("valorCentavos", valor);
        corpo.put("situacao", "confirmado");
        return new Resposta(201, corpo);
    }

    // Chave de idempotência: a chave e a resposta são gravadas na mesma transação
    // do pagamento. Repetir o pedido devolve a resposta guardada, sem pagar de novo.
    // A chave vale dentro de uma administradora: duas administradoras podem gerar a
    // mesma.
    static Resposta registrarPagamento(
        Connection banco,
        String administradora,
        String chave,
        JsonNode corpo
    ) throws Exception {
        if (chave == null || chave.isEmpty()) {
            throw new Problema(
                400,
                "chave-ausente",
                "Chave de idempotência ausente",
                PEDIR_CHAVE
            );
        }
        if (
            !corpo.path("cobranca").isTextual() || !corpo.path("valorCentavos").isInt()
        ) {
            throw new Problema(
                400,
                "pedido-invalido",
                "Pedido inválido",
                "informe cobranca (texto) e valorCentavos (inteiro)"
            );
        }
        // A forma canônica do pedido: só os campos que a operação usa, sempre na
        // mesma ordem. A ordem dos campos no JSON do cliente não muda a comparação.
        ObjectNode pedido = JSON.createObjectNode();
        pedido.put("cobranca", corpo.get("cobranca").asText());
        pedido.put("valorCentavos", corpo.get("valorCentavos").asInt());
        banco.setAutoCommit(false);
        try {
            // Quem grava a chave primeiro processa o pedido. Um pedido simultâneo com
            // a mesma chave espera aqui o primeiro terminar e encontra a resposta
            // pronta.
            var nova = banco.prepareStatement(
                "INSERT INTO chaves_idempotencia (administradora, chave, pedido) " +
                    "VALUES (?, ?, ?) ON CONFLICT DO NOTHING"
            );
            nova.setString(1, administradora);
            nova.setString(2, chave);
            nova.setString(3, paraJson(pedido));
            if (nova.executeUpdate() == 0) {
                var consulta = banco.prepareStatement(
                    "SELECT pedido, status, resposta FROM chaves_idempotencia " +
                        "WHERE administradora = ? AND chave = ?"
                );
                consulta.setString(1, administradora);
                consulta.setString(2, chave);
                var anterior = consulta.executeQuery();
                anterior.next();
                banco.commit();
                if (!anterior.getString("pedido").equals(paraJson(pedido))) {
                    throw new Problema(
                        422,
                        "chave-reutilizada",
                        "Chave de idempotência reutilizada",
                        "a chave " + chave + " já foi usada com outro pedido"
                    );
                }
                JsonNode guardada = JSON.readTree(anterior.getString("resposta"));
                return new Resposta(anterior.getInt("status"), guardada);
            }
            Resposta resposta;
            try {
                int valor = pedido.get("valorCentavos").asInt();
                String cobranca = pedido.get("cobranca").asText();
                resposta = pagar(banco, administradora, cobranca, valor);
            } catch (Problema problema) {
                resposta = problema.resposta();
            }
            var guardar = banco.prepareStatement(
                """
                UPDATE chaves_idempotencia SET status = ?, resposta = ?
                WHERE administradora = ? AND chave = ?"""
            );
            guardar.setInt(1, resposta.status());
            guardar.setString(2, paraJson(resposta.corpo()));
            guardar.setString(3, administradora);
            guardar.setString(4, chave);
            guardar.executeUpdate();
            banco.commit();
            return resposta;
        } catch (Exception erro) {
            banco.rollback();
            throw erro;
        }
    }

    static Map<String, String> consulta(String texto) {
        Map<String, String> parametros = new HashMap<>();
        if (texto == null) return parametros;
        for (String par : texto.split("&")) {
            String[] partes = par.split("=", 2);
            String valor = partes.length > 1 ? partes[1] : "";
            parametros.put(partes[0], URLDecoder.decode(valor, StandardCharsets.UTF_8));
        }
        return parametros;
    }

    static Resposta atender(Connection banco, HttpExchange troca) throws Exception {
        String metodo = troca.getRequestMethod();
        String caminho = troca.getRequestURI().getPath();
        try {
            // Em produção, o gateway valida o token OAuth 2.0 e repassa a
            // administradora dona do token. No laboratório, o cabeçalho
            // Morada-Administradora faz esse papel, e quem o envia é tratado como
            // autenticado.
            var cabecalhos = troca.getRequestHeaders();
            String administradora = cabecalhos.getFirst("Morada-Administradora");
            if (administradora == null || administradora.isEmpty()) {
                throw new Problema(
                    401,
                    "nao-autenticado",
                    "Cliente não identificado",
                    "envie o token de acesso (aqui, o cabeçalho Morada-Administradora)"
                );
            }
            var cobrancas = ROTA_COBRANCAS.matcher(caminho);
            if (metodo.equals("GET") && cobrancas.matches()) {
                var parametros = consulta(troca.getRequestURI().getRawQuery());
                String condominio = cobrancas.group(1);
                return listarCobrancas(banco, administradora, condominio, parametros);
            }
            if (metodo.equals("POST") && caminho.equals("/v1/pagamentos")) {
                String chave = cabecalhos.getFirst("Idempotency-Key");
                JsonNode corpo = JSON.readTree(troca.getRequestBody());
                return registrarPagamento(banco, administradora, chave, corpo);
            }
            throw new Problema(
                404,
                "rota-inexistente",
                "Rota não encontrada",
                "não existe " + metodo + " " + caminho
            );
        } catch (Problema problema) {
            return problema.resposta();
        }
    }

    public static HttpServer criar(String urlBanco) throws IOException {
        var servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        // Uma thread virtual por pedido, cada uma com a sua conexão ao banco
        servidor.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        servidor.createContext("/", troca -> {
            Resposta resposta;
            try (var banco = Banco.conectar(urlBanco)) {
                resposta = atender(banco, troca);
            } catch (Exception erro) {
                throw new IOException(erro);
            }
            byte[] dados = paraJson(resposta.corpo()).getBytes(StandardCharsets.UTF_8);
            String tipo =
                resposta.status() >= 400
                    ? "application/problem+json"
                    : "application/json";
            troca.getResponseHeaders().set("Content-Type", tipo);
            // O 401 diz ao cliente como se autenticar (RFC 9110)
            if (resposta.status() == 401) {
                troca.getResponseHeaders().set("WWW-Authenticate", "Bearer");
            }
            troca.sendResponseHeaders(resposta.status(), dados.length);
            troca.getResponseBody().write(dados);
            troca.close();
        });
        return servidor;
    }

    // Sobe o servidor e devolve o endereço
    public static String subir(HttpServer servidor) {
        servidor.start();
        return "http://127.0.0.1:" + servidor.getAddress().getPort();
    }
}
