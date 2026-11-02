// Uso: java morada.Registro <registro.json>
// Simula a fila de registro em lote e compara o tempo até a confirmação com a meta.
package morada;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.util.Locale;

public class Registro {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    static String numero(long n) {
        return String.format(PT_BR, "%,d", n);
    }

    static String porCento(double n) {
        return String.format(PT_BR, "%.2f%%", n);
    }

    // 10 min | 1 h 36 min | nunca
    static String duracao(Number segundos) {
        if (segundos == null) return "nunca";
        long minutos = Math.round(segundos.doubleValue() / 60);
        long h = minutos / 60;
        if (h == 0) return minutos + " min";
        return minutos % 60 == 0 ? h + " h" : h + " h " + (minutos % 60) + " min";
    }

    public static void main(String[] args) throws Exception {
        var p = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            FilaDeRegistro.Premissas.class
        );
        System.out.println(
            p.id() + ": " + p.descricao() + " (semente " + p.semente() + ")"
        );
        System.out.println(
            "  premissas: " +
                numero(p.boletos()) +
                " boletos em arquivos de " +
                numero(p.boletosPorArquivo()) +
                ", " +
                numero(p.registrosPorSegundo()) +
                " por segundo,"
        );
        System.out.println(
            "  retorno " +
                duracao(p.retornoSegundos()) +
                " depois de cada arquivo, " +
                p.falhaPassageiraPorCento() +
                "% de recusa passageira, 1 em " +
                p.recusaDefinitivaACada() +
                " definitiva"
        );
        System.out.println(
            "  estimativa por divisão: " +
                duracao((double) p.boletos() / p.registrosPorSegundo()) +
                "  meta: todos em até " +
                duracao(p.limiteSegundos())
        );
        int falhas = 0;
        for (boolean ajustada : new boolean[] { false, true }) {
            var r = FilaDeRegistro.simular(p, ajustada);
            int dentro = FilaDeRegistro.disponiveisAte(r, p.limiteSegundos());
            boolean passou = dentro == p.boletos();
            if (!passou) falhas++;
            System.out.println(ajustada ? "ajustada:" : "ingênua:");
            System.out.println(
                "  arquivos: " +
                    r.arquivos +
                    "  tentativas de registro: " +
                    numero(r.tentativas)
            );
            System.out.println(
                "  disponível em p50: " +
                    pct(r, p, 500) +
                    "  p95: " +
                    pct(r, p, 950) +
                    "  p99: " +
                    pct(r, p, 990) +
                    "  p99,9: " +
                    pct(r, p, 999)
            );
            System.out.println(
                "  última disponível: " +
                    duracao(r.disponivelEm.lastKey()) +
                    "  sem registro: " +
                    numero(r.semRegistro) +
                    "  com Pix: " +
                    numero(r.viaPix)
            );
            System.out.println(
                "  em até " +
                    duracao(p.limiteSegundos()) +
                    ": " +
                    numero(dentro) +
                    " (" +
                    porCento((100.0 * dentro) / p.boletos()) +
                    ")"
            );
            System.out.println("  resultado: " + (passou ? "PASSOU" : "FALHOU"));
        }
        System.exit(falhas > 0 ? 1 : 0);
    }

    private static String pct(
        FilaDeRegistro.Resultado r,
        FilaDeRegistro.Premissas p,
        int milesimos
    ) {
        return duracao(FilaDeRegistro.percentil(r, p.boletos(), milesimos));
    }
}
