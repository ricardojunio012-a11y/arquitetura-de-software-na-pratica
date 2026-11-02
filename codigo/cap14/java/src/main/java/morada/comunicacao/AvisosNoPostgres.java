// Repositório de avisos no PostgreSQL. A chave primária garante, no banco, que o
// mesmo aviso não é gravado duas vezes.
package morada.comunicacao;

import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import morada.comunicacao.Comunicacao.RepositorioDeAvisos;

public class AvisosNoPostgres implements RepositorioDeAvisos, AutoCloseable {

    private final Connection banco;

    private AvisosNoPostgres(Connection banco) {
        this.banco = banco;
    }

    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    public static AvisosNoPostgres conectar(String url) throws SQLException {
        URI u = URI.create(url);
        String[] credenciais = u.getUserInfo().split(":");
        Connection banco = DriverManager.getConnection(
            "jdbc:postgresql://" + u.getHost() + ":" + u.getPort() + u.getPath(),
            credenciais[0],
            credenciais[1]
        );
        try (var sql = banco.createStatement()) {
            sql.execute("DROP TABLE IF EXISTS avisos");
            sql.execute(
                "CREATE TABLE avisos (id text PRIMARY KEY, texto text NOT NULL)"
            );
        }
        return new AvisosNoPostgres(banco);
    }

    public boolean jaEnviado(String id) {
        try (
            var consulta = banco.prepareStatement("SELECT 1 FROM avisos WHERE id = ?")
        ) {
            consulta.setString(1, id);
            return consulta.executeQuery().next();
        } catch (SQLException erro) {
            throw new IllegalStateException(erro);
        }
    }

    public void registrar(String id, String texto) {
        try (var sql = banco.prepareStatement("INSERT INTO avisos VALUES (?, ?)")) {
            sql.setString(1, id);
            sql.setString(2, texto);
            sql.executeUpdate();
        } catch (SQLException erro) {
            throw new IllegalStateException(erro);
        }
    }

    public void close() throws SQLException {
        banco.close();
    }
}
