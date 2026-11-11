// Conexão com o PostgreSQL e um esquema limpo para cada experimento.
package morada;

import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class Banco {

    private Banco() {}

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

    public static void recriarEsquema(Connection banco) throws SQLException {
        try (var sql = banco.createStatement()) {
            sql.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
        }
    }
}
