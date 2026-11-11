// O relatório de inadimplentes do síndico, com o defeito que o capítulo usa para
// mostrar o vazamento: a consulta esqueceu o filtro de condomínio.
package morada;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public final class Relatorio {

    private Relatorio() {}

    public record Inadimplente(
        int condominio,
        String unidade,
        String morador,
        int valor
    ) {}

    public static List<Inadimplente> inadimplentes(Connection banco)
        throws SQLException {
        List<Inadimplente> lista = new ArrayList<>();
        try (var sql = banco.createStatement()) {
            var linhas = sql.executeQuery(
                """
                SELECT condominio_id, unidade, morador, valor_centavos
                FROM cobrancas
                WHERE situacao = 'aberta' -- falta: AND condominio_id = ?
                ORDER BY condominio_id, unidade"""
            );
            while (linhas.next()) {
                lista.add(
                    new Inadimplente(
                        linhas.getInt(1),
                        linhas.getString(2),
                        linhas.getString(3),
                        linhas.getInt(4)
                    )
                );
            }
        }
        return lista;
    }
}
