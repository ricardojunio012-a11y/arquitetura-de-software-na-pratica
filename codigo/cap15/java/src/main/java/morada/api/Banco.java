// O banco da API: condomínios, cobranças, pagamentos e chaves de idempotência. A
// chave primária da tabela de chaves, (administradora, chave), garante um único
// processamento por chave de cada cliente, mesmo com pedidos simultâneos.
package morada.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class Banco {

    private Banco() {}

    static final String TABELAS = """
    DROP TABLE IF EXISTS chaves_idempotencia, pagamentos, cobrancas, condominios;
    DROP SEQUENCE IF EXISTS pagamentos_seq;
    CREATE TABLE condominios (id text PRIMARY KEY, administradora text NOT NULL);
    CREATE TABLE cobrancas (
      id text PRIMARY KEY,
      condominio text NOT NULL REFERENCES condominios,
      unidade text NOT NULL,
      vencimento date NOT NULL,
      valor_centavos integer NOT NULL,
      situacao text NOT NULL
    );
    CREATE TABLE pagamentos (
      id text PRIMARY KEY,
      cobranca text NOT NULL UNIQUE REFERENCES cobrancas,
      valor_centavos integer NOT NULL
    );
    CREATE SEQUENCE pagamentos_seq;
    CREATE TABLE chaves_idempotencia (
      administradora text,
      chave text,
      pedido text NOT NULL,
      status integer,
      resposta text,
      PRIMARY KEY (administradora, chave)
    )""";

    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    public static Connection conectar(String url) throws SQLException {
        URI u = URI.create(url);
        String[] credenciais = u.getUserInfo().split(":");
        return DriverManager.getConnection(
            "jdbc:postgresql://" + u.getHost() + ":" + u.getPort() + u.getPath(),
            credenciais[0],
            credenciais[1]
        );
    }

    public static void preparar(String url, String arquivoCobrancas) throws Exception {
        try (var banco = conectar(url)) {
            try (var sql = banco.createStatement()) {
                sql.execute(TABELAS);
            }
            // Quem administra cada condomínio fica em condominios.json, ao lado das
            // cobranças
            var json = new ObjectMapper();
            File pasta = new File(arquivoCobrancas).getParentFile();
            var condominio = banco.prepareStatement(
                "INSERT INTO condominios VALUES (?, ?)"
            );
            for (JsonNode c : json.readTree(new File(pasta, "condominios.json"))) {
                condominio.setString(1, c.get("id").asText());
                condominio.setString(2, c.get("administradora").asText());
                condominio.executeUpdate();
            }
            var cobranca = banco.prepareStatement(
                "INSERT INTO cobrancas VALUES (?, ?, ?, ?::date, ?, ?)"
            );
            for (JsonNode c : json.readTree(new File(arquivoCobrancas))) {
                cobranca.setString(1, c.get("id").asText());
                cobranca.setString(2, c.get("condominio").asText());
                cobranca.setString(3, c.get("unidade").asText());
                cobranca.setString(4, c.get("vencimento").asText());
                cobranca.setInt(5, c.get("valorCentavos").asInt());
                cobranca.setString(6, c.get("situacao").asText());
                cobranca.executeUpdate();
            }
        }
    }
}
