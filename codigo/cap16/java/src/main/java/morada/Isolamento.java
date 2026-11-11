// A versão "isolamento": duas saídas do fundo de reserva, intercaladas sempre na
// mesma ordem, em três níveis de isolamento. Cada transação confere o saldo antes
// de registrar a sua saída, e mesmo assim o saldo pode ficar negativo.
package morada;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Isolamento {

    static final String FALHA_DE_SERIALIZACAO = "40001";
    static final List<String> REGISTRO = new ArrayList<>();

    static Connection transacao(String url, int nivel) throws SQLException {
        Connection t = Banco.conectar(url);
        t.setAutoCommit(false);
        t.setTransactionIsolation(nivel);
        return t;
    }

    // Uma saída inteira, sem intercalação: usada na nova tentativa
    static void tentarDeNovo(Connection t, int valor, String motivo)
        throws SQLException {
        int lido = Fundo.saldo(t, 1);
        REGISTRO.add("T2 lê o saldo: " + Fundo.reais(lido));
        if (lido < valor) {
            REGISTRO.add(
                "T2 recusa a saída de " + Fundo.reais(valor) + ": saldo insuficiente"
            );
            t.rollback();
            return;
        }
        Fundo.inserirSaida(t, 1, valor, motivo);
        t.commit();
        REGISTRO.add("T2 registra a saída de " + Fundo.reais(valor) + " e confirma");
    }

    public static void main(String[] args) throws Exception {
        Path dados = Path.of(args[0]);
        String url = System.getenv("BANCO_URL");
        Map<String, Integer> niveis = new LinkedHashMap<>();
        niveis.put("READ COMMITTED", Connection.TRANSACTION_READ_COMMITTED);
        niveis.put("REPEATABLE READ", Connection.TRANSACTION_REPEATABLE_READ);
        niveis.put("SERIALIZABLE", Connection.TRANSACTION_SERIALIZABLE);
        try (var banco = Banco.conectar(url)) {
            Banco.recriarEsquema(banco);
            Migracoes.aplicar(banco, dados.resolve("migracoes"));
            for (var nivel : niveis.entrySet()) {
                REGISTRO.add("== " + nivel.getKey());
                Fundo.preparar(banco);
                // A transação começa no primeiro comando de cada conexão
                try (
                    var t1 = transacao(url, nivel.getValue());
                    var t2 = transacao(url, nivel.getValue())
                ) {
                    REGISTRO.add("T1 e T2 começam");
                    int lido1 = Fundo.saldo(t1, 1);
                    REGISTRO.add("T1 lê o saldo: " + Fundo.reais(lido1));
                    int lido2 = Fundo.saldo(t2, 1);
                    REGISTRO.add("T2 lê o saldo: " + Fundo.reais(lido2));
                    if (lido1 >= 70000) {
                        Fundo.inserirSaida(t1, 1, 70000, "conserto do portão");
                        REGISTRO.add("T1 registra a saída de " + Fundo.reais(70000));
                    }
                    if (lido2 >= 60000) {
                        Fundo.inserirSaida(t2, 1, 60000, "pintura da fachada");
                        REGISTRO.add("T2 registra a saída de " + Fundo.reais(60000));
                    }
                    t1.commit();
                    REGISTRO.add("T1 confirma");
                    try {
                        t2.commit();
                        REGISTRO.add("T2 confirma");
                    } catch (SQLException erro) {
                        if (
                            !FALHA_DE_SERIALIZACAO.equals(erro.getSQLState())
                        ) throw erro;
                        REGISTRO.add(
                            "T2 não confirma: falha de serialização; tenta de novo"
                        );
                        t2.rollback();
                        tentarDeNovo(t2, 60000, "pintura da fachada");
                    }
                }
                int saldoFinal = Fundo.saldo(banco, 1);
                String aviso = saldoFinal < 0 ? " (negativo: a regra foi violada)" : "";
                REGISTRO.add("saldo final: " + Fundo.reais(saldoFinal) + aviso);
                REGISTRO.add("");
            }
        }
        Path saida = dados.resolve("saida/isolamento");
        Files.createDirectories(saida);
        Files.writeString(saida.resolve("execucao.txt"), String.join("\n", REGISTRO));
        System.out.println("isolamento: três níveis executados");
    }
}
