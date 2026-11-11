// Row-Level Security no PostgreSQL: uma consulta sem filtro só enxerga o condomínio
// da transação, e gravar no condomínio de outro é recusado. A administradora
// enxerga os condomínios que administra, e só eles. Na construção da imagem não há
// banco, e por isso os testes são pulados.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class RlsTest {

    @Test
    void isolaLeituraEEscritaPorCondominio() throws Exception {
        String url = System.getenv("BANCO_URL");
        assumeTrue(url != null, "sem banco");
        try (
            var admin = Banco.conectar(url);
            var app = Banco.conectar(System.getenv("APP_BANCO_URL"));
            var sql = admin.createStatement()
        ) {
            sql.execute(Files.readString(Path.of("/dados/sql/esquema.sql")));
            sql.execute(Files.readString(Path.of("/dados/sql/rls.sql")));
            List<Integer> condominios = Banco.comoCondominio(app, 15, () -> {
                List<Integer> lista = new ArrayList<>();
                try (var consulta = app.createStatement()) {
                    var linhas = consulta.executeQuery(
                        "SELECT DISTINCT condominio_id FROM cobrancas"
                    );
                    while (linhas.next()) lista.add(linhas.getInt(1));
                }
                return lista;
            });
            assertEquals(List.of(15), condominios);
            var erro = assertThrows(SQLException.class, () ->
                Banco.comoCondominio(app, 15, () -> {
                    try (var insercao = app.createStatement()) {
                        return insercao.executeUpdate(
                            "INSERT INTO cobrancas " +
                                "(condominio_id, unidade, morador, valor_centavos, situacao) " +
                                "VALUES (20, 'B-1', 'Íris Melo', 61000, 'aberta')"
                        );
                    }
                })
            );
            assertEquals("42501", erro.getSQLState());
        }
    }

    @Test
    void aAdministradoraVeOsCondominiosQueAdministraESoEles() throws Exception {
        String url = System.getenv("BANCO_URL");
        assumeTrue(url != null, "sem banco");
        try (
            var admin = Banco.conectar(url);
            var app = Banco.conectar(System.getenv("APP_BANCO_URL"));
            var sql = admin.createStatement()
        ) {
            sql.execute(Files.readString(Path.of("/dados/sql/esquema.sql")));
            sql.execute(Files.readString(Path.of("/dados/sql/rls.sql")));
            List<Integer> condominios = Banco.comoAdministradora(app, 3, () -> {
                List<Integer> lista = new ArrayList<>();
                try (var consulta = app.createStatement()) {
                    var linhas = consulta.executeQuery(
                        "SELECT DISTINCT condominio_id FROM cobrancas ORDER BY 1"
                    );
                    while (linhas.next()) lista.add(linhas.getInt(1));
                }
                return lista;
            });
            assertEquals(List.of(12, 15), condominios);
        }
    }
}
