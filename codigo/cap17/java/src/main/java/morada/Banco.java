// Conexão com o PostgreSQL e transações em nome de um condomínio ou de uma
// administradora.
package morada;

import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class Banco {

    private Banco() {}

    public interface Trabalho<T> {
        T executar() throws SQLException;
    }

    // URL: postgresql://usuario:senha@servidor:porta/banco
    public static Connection conectar(String url) throws SQLException {
        URI u = URI.create(url);
        String[] credenciais = u.getUserInfo().split(":");
        return DriverManager.getConnection(
            "jdbc:postgresql://" + u.getHost() + ":" + u.getPort() + u.getPath(),
            credenciais[0],
            credenciais[1]
        );
    }

    // Executa um trabalho numa transação em nome de quem pede. O "true" do
    // set_config faz o valor valer só nesta transação: numa conexão reaproveitada de
    // um pool, o condomínio do pedido anterior não sobra para o próximo.
    private static <T> T emNomeDe(
        Connection banco,
        String configuracao,
        Integer valor,
        Trabalho<T> trabalho
    ) throws SQLException {
        banco.setAutoCommit(false);
        try {
            if (valor != null) {
                try (
                    var config = banco.prepareStatement("SELECT set_config(?, ?, true)")
                ) {
                    config.setString(1, configuracao);
                    config.setString(2, valor.toString());
                    config.executeQuery();
                }
            }
            T resultado = trabalho.executar();
            banco.commit();
            return resultado;
        } catch (SQLException erro) {
            banco.rollback();
            throw erro;
        } finally {
            banco.setAutoCommit(true);
        }
    }

    // O síndico age em nome de um condomínio. A administradora age em nome de todos
    // os que administra, que a política do banco busca na tabela administracoes.
    public static <T> T comoCondominio(
        Connection banco,
        Integer condominio,
        Trabalho<T> trabalho
    ) throws SQLException {
        return emNomeDe(banco, "app.condominio", condominio, trabalho);
    }

    public static <T> T comoAdministradora(
        Connection banco,
        int administradora,
        Trabalho<T> trabalho
    ) throws SQLException {
        return emNomeDe(banco, "app.administradora", administradora, trabalho);
    }
}
