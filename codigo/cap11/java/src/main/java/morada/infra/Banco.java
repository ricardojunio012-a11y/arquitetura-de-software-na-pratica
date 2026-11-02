// O banco do Financeiro: os pagamentos e, na versão com outbox, a tabela de eventos
// a publicar, gravada na mesma transação do pagamento.
package morada.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import morada.Eventos.Pagamento;
import morada.Eventos.PagamentoConfirmado;

public class Banco {

    private static final ObjectMapper JSON = new ObjectMapper();

    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    public static Connection conectar() throws Exception {
        URI u = URI.create(System.getenv("BANCO_URL"));
        String[] credenciais = u.getUserInfo().split(":");
        String jdbc =
            "jdbc:postgresql://" + u.getHost() + ":" + u.getPort() + u.getPath();
        Connection banco = DriverManager.getConnection(
            jdbc,
            credenciais[0],
            credenciais[1]
        );
        try (var sql = banco.createStatement()) {
            sql.execute("DROP TABLE IF EXISTS outbox, pagamentos");
            sql.execute(
                "CREATE TABLE pagamentos (id text PRIMARY KEY, unidade text, " +
                    "reserva text, valor_centavos integer)"
            );
            sql.execute(
                "CREATE TABLE outbox (id serial PRIMARY KEY, evento text UNIQUE, " +
                    "conteudo text, publicado boolean NOT NULL DEFAULT false)"
            );
        }
        return banco;
    }

    public static void gravarPagamento(Connection banco, Pagamento p)
        throws SQLException {
        try (
            var sql = banco.prepareStatement(
                "INSERT INTO pagamentos VALUES (?, ?, ?, ?)"
            )
        ) {
            sql.setString(1, p.pagamento());
            sql.setString(2, p.unidade());
            sql.setString(3, p.reserva());
            sql.setLong(4, p.valorCentavos());
            sql.executeUpdate();
        }
    }

    // Pagamento e evento na mesma transação: ou os dois ficam gravados, ou nenhum
    public static void gravarComOutbox(
        Connection banco,
        Pagamento p,
        PagamentoConfirmado e
    ) throws Exception {
        banco.setAutoCommit(false);
        try {
            gravarPagamento(banco, p);
            try (
                var sql = banco.prepareStatement(
                    "INSERT INTO outbox (evento, conteudo) VALUES (?, ?)"
                )
            ) {
                sql.setString(1, e.evento());
                sql.setString(2, JSON.writeValueAsString(e));
                sql.executeUpdate();
            }
            banco.commit();
        } catch (Exception erro) {
            banco.rollback();
            throw erro;
        } finally {
            banco.setAutoCommit(true);
        }
    }
}
