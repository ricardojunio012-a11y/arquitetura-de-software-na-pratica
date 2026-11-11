// Migrações versionadas: cada arquivo de migracoes/ roda uma única vez, em ordem, e
// fica registrado na tabela migracoes_aplicadas. Um arquivo que começa com
// "-- sem transação" roda fora de transação (CREATE INDEX CONCURRENTLY exige isso).
package morada;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class Migracoes {

    private Migracoes() {}

    public static List<String> aplicar(Connection banco, Path pasta)
        throws IOException, SQLException {
        return aplicar(banco, pasta, Integer.MAX_VALUE);
    }

    public static List<String> aplicar(Connection banco, Path pasta, int ate)
        throws IOException, SQLException {
        try (var sql = banco.createStatement()) {
            sql.execute(
                """
                CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
                  versao text PRIMARY KEY,
                  aplicada_em timestamptz NOT NULL DEFAULT now()
                )"""
            );
        }
        Set<String> feitas = new HashSet<>();
        try (var sql = banco.createStatement()) {
            var linhas = sql.executeQuery("SELECT versao FROM migracoes_aplicadas");
            while (linhas.next()) feitas.add(linhas.getString(1));
        }
        List<String> arquivos;
        try (var lista = Files.list(pasta)) {
            arquivos = lista
                .map(p -> p.getFileName().toString())
                .filter(nome -> nome.endsWith(".sql"))
                .sorted()
                .toList();
        }
        List<String> aplicadas = new ArrayList<>();
        for (String arquivo : arquivos) {
            if (Integer.parseInt(arquivo.split("_")[0]) > ate) break;
            if (feitas.contains(arquivo)) continue;
            String conteudo = Files.readString(pasta.resolve(arquivo));
            boolean semTransacao = conteudo.startsWith("-- sem transação");
            // A migração e o seu registro entram juntos, ou nenhum dos dois
            banco.setAutoCommit(semTransacao);
            try (
                var sql = banco.createStatement();
                var registrar = banco.prepareStatement(
                    "INSERT INTO migracoes_aplicadas (versao) VALUES (?)"
                )
            ) {
                sql.execute(conteudo);
                registrar.setString(1, arquivo);
                registrar.executeUpdate();
                if (!semTransacao) banco.commit();
            } catch (SQLException erro) {
                if (!semTransacao) banco.rollback();
                throw erro;
            } finally {
                banco.setAutoCommit(true);
            }
            aplicadas.add(arquivo);
        }
        return aplicadas;
    }
}
