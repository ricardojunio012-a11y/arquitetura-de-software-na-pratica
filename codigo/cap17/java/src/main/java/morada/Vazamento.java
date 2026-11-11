// A versão "vazamento": o síndico do condomínio 12 abre o relatório de inadimplentes,
// primeiro sem RLS e depois com RLS. Depois, a administradora 3, que administra os
// condomínios 12 e 15, abre o mesmo relatório. A consulta com defeito é a mesma em
// todos os casos.
package morada;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import morada.Relatorio.Inadimplente;

public class Vazamento {

    static final int SINDICO = 12;
    static final int ADMINISTRADORA = 3; // administra os condomínios 12 e 15
    static final String RECUSADO_PELA_POLITICA = "42501";
    static final List<String> REGISTRO = new ArrayList<>();

    static void mostrar(int passo, String titulo, List<Inadimplente> linhas) {
        mostrar(passo, titulo, linhas, List.of(SINDICO));
    }

    static void mostrar(
        int passo,
        String titulo,
        List<Inadimplente> linhas,
        List<Integer> permitidos
    ) {
        REGISTRO.add(passo + ". " + titulo);
        long vazadas = 0;
        for (Inadimplente l : linhas) {
            boolean outro = !permitidos.contains(l.condominio());
            if (outro) vazadas++;
            REGISTRO.add(
                "   condomínio " +
                    l.condominio() +
                    " | unidade " +
                    l.unidade() +
                    " | " +
                    l.morador() +
                    " | " +
                    l.valor() +
                    " centavos" +
                    (outro ? "  <- outro condomínio" : "")
            );
        }
        if (linhas.isEmpty()) REGISTRO.add("   nenhuma linha");
        REGISTRO.add("   linhas de outros condomínios: " + vazadas);
        REGISTRO.add("");
    }

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        try (
            var admin = Banco.conectar(System.getenv("BANCO_URL"));
            var app = Banco.conectar(System.getenv("APP_BANCO_URL"));
            var sql = admin.createStatement()
        ) {
            sql.execute(Files.readString(dados.resolve("sql/esquema.sql")));
            mostrar(
                1,
                "relatório do síndico do condomínio 12, sem RLS",
                Banco.comoCondominio(app, SINDICO, () -> Relatorio.inadimplentes(app))
            );
            sql.execute(Files.readString(dados.resolve("sql/rls.sql")));
            mostrar(
                2,
                "o mesmo relatório, com RLS",
                Banco.comoCondominio(app, SINDICO, () -> Relatorio.inadimplentes(app))
            );
            mostrar(
                3,
                "com RLS, numa transação sem condomínio definido",
                Banco.comoCondominio(app, null, () -> Relatorio.inadimplentes(app))
            );

            REGISTRO.add("4. com RLS, o condomínio 12 tenta gravar uma cobrança do 15");
            try {
                Banco.comoCondominio(app, SINDICO, () -> {
                    try (var insercao = app.createStatement()) {
                        return insercao.executeUpdate(
                            "INSERT INTO cobrancas " +
                                "(condominio_id, unidade, morador, valor_centavos, situacao) " +
                                "VALUES (15, '13', 'Hugo Dias', 38000, 'aberta')"
                        );
                    }
                });
                REGISTRO.add("   gravada");
            } catch (SQLException erro) {
                if (!RECUSADO_PELA_POLITICA.equals(erro.getSQLState())) throw erro;
                REGISTRO.add(
                    "   recusada pelo banco: a linha não passa na política de RLS"
                );
            }

            mostrar(
                5,
                "com RLS, a administradora 3, que administra os condomínios 12 e 15",
                Banco.comoAdministradora(app, ADMINISTRADORA, () ->
                    Relatorio.inadimplentes(app)
                ),
                List.of(12, 15)
            );
            REGISTRO.add(
                "6. com RLS, a administradora 3 tenta gravar uma cobrança do 20"
            );
            try {
                Banco.comoAdministradora(app, ADMINISTRADORA, () -> {
                    try (var insercao = app.createStatement()) {
                        return insercao.executeUpdate(
                            "INSERT INTO cobrancas " +
                                "(condominio_id, unidade, morador, valor_centavos, situacao) " +
                                "VALUES (20, 'A-5', 'Hugo Dias', 61000, 'aberta')"
                        );
                    }
                });
                REGISTRO.add("   gravada");
            } catch (SQLException erro) {
                if (!RECUSADO_PELA_POLITICA.equals(erro.getSQLState())) throw erro;
                REGISTRO.add(
                    "   recusada pelo banco: a linha não passa em nenhuma política"
                );
            }
        }
        Path saida = dados.resolve("saida/vazamento");
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("relatorio.txt"),
            String.join("\n", REGISTRO) + "\n"
        );
        System.out.println("vazamento: seis passos executados");
    }
}
