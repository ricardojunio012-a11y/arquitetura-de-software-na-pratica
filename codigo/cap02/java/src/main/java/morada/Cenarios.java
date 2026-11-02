// Cenários de qualidade executáveis: geram carga sintética, medem o que é nosso,
// estimam o que depende de terceiros e comparam o total com a meta.
package morada;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.cobranca.Aviso;
import morada.cobranca.Boleto;
import morada.cobranca.Calculo;
import morada.cobranca.Cobranca;
import morada.cobranca.Competencia;
import morada.cobranca.DadosDoCondominio;
import morada.cobranca.EmailEmArquivo;
import morada.cobranca.Unidade;

public final class Cenarios {

    public record Cenario(
        String id,
        String descricao,
        int condominios,
        int unidadesPorCondominio,
        int registrosPorSegundo, // capacidade do banco emissor para registrar boletos
        long limiteSegundos
    ) {}

    public record Resultado(
        Cenario cenario,
        long cobrancas,
        double segundosCalculo, // medido
        double segundosRegistro, // estimado
        long bytesAvisos,
        boolean passou
    ) {}

    private Cenarios() {}

    // Condomínio sintético e determinístico: a mesma carga em qualquer linguagem
    public static DadosDoCondominio condominioSintetico(int i, int unidades) {
        List<Unidade> lista = new ArrayList<>();
        for (int k = 1; k <= unidades; k++) {
            var morador = new Unidade.Morador(
                "Morador " + k,
                "morador" + k + "@exemplo.com",
                null,
                "email"
            );
            var debito =
                k % 7 == 0 ? new Unidade.DebitoAnterior(50000, "2026-02-10") : null;
            lista.add(
                new Unidade("U-" + k, 1000000 / unidades, morador, "boleto", debito)
            );
        }
        long despesas = 3000000 + (i % 50) * 10000L;
        var condominio = new DadosDoCondominio.Condominio(
            "cond-" + i,
            "Condomínio " + i,
            despesas
        );
        return new DadosDoCondominio(condominio, lista);
    }

    // A medida de resposta do cenário: terminar dentro do limite
    public static boolean avaliar(double segundos, double limiteSegundos) {
        return segundos <= limiteSegundos;
    }

    public static Resultado executar(Cenario cenario, LocalDate hoje) {
        Boleto boleto = new Boleto();
        Competencia competencia = Competencia.de(hoje);
        long cobrancas = 0;
        long bytesAvisos = 0;
        long inicio = System.nanoTime();
        for (int i = 1; i <= cenario.condominios(); i++) {
            DadosDoCondominio dados = condominioSintetico(
                i,
                cenario.unidadesPorCondominio()
            );
            var condominio = dados.condominio();
            for (Unidade unidade : dados.unidades()) {
                Cobranca cobranca = Calculo.calcularCobranca(
                    condominio.despesasDoMesCentavos(),
                    unidade,
                    hoje
                );
                String codigo = boleto.gerarCodigo(
                    condominio.id(),
                    competencia,
                    cobranca
                );
                var aviso = new Aviso(
                    condominio.nome(),
                    competencia,
                    cobranca,
                    boleto.nome(),
                    codigo
                );
                bytesAvisos += EmailEmArquivo.formatar(aviso)
                    .getBytes(StandardCharsets.UTF_8)
                    .length;
                cobrancas++;
            }
        }
        double segundosCalculo = (System.nanoTime() - inicio) / 1e9;
        // O registro depende do banco emissor: estimamos pela capacidade dele
        double segundosRegistro = (double) cobrancas / cenario.registrosPorSegundo();
        double total = segundosCalculo + segundosRegistro;
        return new Resultado(
            cenario,
            cobrancas,
            segundosCalculo,
            segundosRegistro,
            bytesAvisos,
            avaliar(total, cenario.limiteSegundos())
        );
    }
}
