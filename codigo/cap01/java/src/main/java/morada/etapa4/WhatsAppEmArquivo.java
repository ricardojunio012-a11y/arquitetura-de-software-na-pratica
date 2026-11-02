// Novo canal de aviso: entra sem mexer no e-mail.
// Simula o envio gravando as mensagens num arquivo.
package morada.etapa4;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class WhatsAppEmArquivo implements Notificador {

    private final Path arquivo;

    public WhatsAppEmArquivo(Path arquivo) throws IOException {
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
        StringBuilder texto = new StringBuilder(
            aviso.condominio() +
                ": taxa " +
                aviso.competencia().rotulo() +
                " da unidade " +
                u.id() +
                ": R$ " +
                Dinheiro.reais(c.total()) +
                ", vence " +
                aviso.competencia().vencimento() +
                "."
        );
        if (c.totalAte05() != null) {
            texto
                .append(" Até ")
                .append(aviso.competencia().limiteDesconto())
                .append(": R$ ")
                .append(Dinheiro.reais(c.totalAte05()))
                .append(".");
        }
        texto
            .append(" ")
            .append(aviso.nomeDoPagamento())
            .append(": ")
            .append(aviso.codigoDePagamento());
        return "Para: " + u.morador().telefone() + "\n" + texto + "\n----\n";
    }
}
