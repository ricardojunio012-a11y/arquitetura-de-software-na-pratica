// O fundo de reserva: o saldo é a soma dos movimentos, e uma saída só pode ser
// registrada se houver saldo.
package morada;

import java.sql.Connection;
import java.sql.SQLException;

public final class Fundo {

    private Fundo() {}

    public static void preparar(Connection banco) throws SQLException {
        try (var sql = banco.createStatement()) {
            sql.execute("TRUNCATE movimentos");
            sql.execute("INSERT INTO fundos VALUES (1, 1234) ON CONFLICT DO NOTHING");
            sql.execute(
                "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) " +
                    "VALUES (1, 100000, 'saldo inicial')"
            );
        }
    }

    public static int saldo(Connection banco, int fundo) throws SQLException {
        try (
            var consulta = banco.prepareStatement(
                "SELECT coalesce(sum(valor_centavos), 0)::int FROM movimentos " +
                    "WHERE fundo_id = ?"
            )
        ) {
            consulta.setInt(1, fundo);
            var linha = consulta.executeQuery();
            linha.next();
            return linha.getInt(1);
        }
    }

    public static void inserirSaida(
        Connection banco,
        int fundo,
        int valor,
        String descricao
    ) throws SQLException {
        try (
            var insercao = banco.prepareStatement(
                "INSERT INTO movimentos (fundo_id, valor_centavos, descricao) " +
                    "VALUES (?, ?, ?)"
            )
        ) {
            insercao.setInt(1, fundo);
            insercao.setInt(2, -valor);
            insercao.setString(3, descricao);
            insercao.executeUpdate();
        }
    }

    // A forma correta em READ COMMITTED: travar a linha do fundo antes de ler o saldo.
    // Duas saídas do mesmo fundo passam a acontecer uma depois da outra.
    public static boolean registrarSaida(
        Connection banco,
        int fundo,
        int valor,
        String descricao
    ) throws SQLException {
        banco.setAutoCommit(false);
        try (
            var trava = banco.prepareStatement(
                "SELECT id FROM fundos WHERE id = ? FOR UPDATE"
            )
        ) {
            trava.setInt(1, fundo);
            trava.executeQuery();
            if (saldo(banco, fundo) < valor) {
                banco.rollback();
                return false;
            }
            inserirSaida(banco, fundo, valor, descricao);
            banco.commit();
            return true;
        } catch (SQLException erro) {
            banco.rollback();
            throw erro;
        } finally {
            banco.setAutoCommit(true);
        }
    }

    // 123456 centavos → "1.234,56"
    public static String reais(int centavos) {
        String sinal = centavos < 0 ? "-" : "";
        int absoluto = Math.abs(centavos);
        String inteiro = String.format("%,d", absoluto / 100).replace(',', '.');
        return sinal + inteiro + "," + String.format("%02d", absoluto % 100);
    }
}
