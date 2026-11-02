// Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
package morada.etapa4;

import java.time.LocalDate;
import java.util.Map;

public final class Aplicacao {

    private Aplicacao() {}

    public static RelatorioDeCobrancas gerarCobrancaMensal(
        DadosDoCondominio dados,
        LocalDate hoje,
        Map<String, MeioDePagamento> meiosDePagamento,
        Map<String, Notificador> notificadores
    ) {
        DadosDoCondominio.Condominio condominio = dados.condominio();
        Competencia competencia = Competencia.de(hoje);
        RelatorioDeCobrancas relatorio = new RelatorioDeCobrancas(
            condominio.nome(),
            competencia
        );
        for (Unidade unidade : dados.unidades()) {
            MeioDePagamento pagamento = meiosDePagamento.get(unidade.meioPagamento());
            Notificador notificador = notificadores.get(unidade.morador().canal());
            Cobranca cobranca = Calculo.calcularCobranca(
                condominio.despesasDoMesCentavos(),
                unidade,
                hoje
            );
            String codigo = pagamento.gerarCodigo(
                condominio.id(),
                competencia,
                cobranca
            );
            relatorio.adicionar(cobranca, codigo);
            notificador.notificar(
                new Aviso(
                    condominio.nome(),
                    competencia,
                    cobranca,
                    pagamento.nome(),
                    codigo
                )
            );
        }
        return relatorio;
    }
}
