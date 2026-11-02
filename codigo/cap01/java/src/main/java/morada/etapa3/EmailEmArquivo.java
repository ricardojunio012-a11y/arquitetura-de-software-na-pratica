// Simula o envio de e-mail gravando as mensagens num arquivo.
package morada.etapa3;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

public class EmailEmArquivo implements Notificador {

    private final Path arquivo;

    public EmailEmArquivo(Path arquivo) throws IOException {
        this.arquivo = arquivo;
        Files.writeString(arquivo, "");
    }

    @Override
    public void notificar(Aviso aviso) {
        try {
            Files.writeString(arquivo, formatar(aviso), StandardOpenOption.APPEND);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static String formatar(Aviso aviso) {
        Cobranca c = aviso.cobranca();
        Unidade u = c.unidade();
        String competencia = aviso.competencia().rotulo();
        List<String> linhas = new ArrayList<>(
            List.of(
                "Para: " + u.morador().email(),
                "Assunto: Taxa condominial " +
                    competencia +
                    " - " +
                    aviso.condominio() +
                    " - Unidade " +
                    u.id(),
                "",
                "Olá, " + u.morador().nome() + ".",
                "",
                "A taxa condominial de " +
                    competencia +
                    " da unidade " +
                    u.id() +
                    " está disponível.",
                "Valor: R$ " + Dinheiro.reais(c.total()),
                "Vencimento: " + aviso.competencia().vencimento()
            )
        );
        if (c.debito() > 0) {
            linhas.add(
                "Inclui débito anterior de R$ " +
                    Dinheiro.reais(c.debito()) +
                    ", com multa de R$ " +
                    Dinheiro.reais(c.multa()) +
                    " e juros de R$ " +
                    Dinheiro.reais(c.juros()) +
                    "."
            );
        }
        linhas.addAll(
            List.of(
                aviso.nomeDoPagamento() + ": " + aviso.codigoDePagamento(),
                "",
                "Administração do " + aviso.condominio(),
                "----"
            )
        );
        return String.join("\n", linhas) + "\n";
    }
}
