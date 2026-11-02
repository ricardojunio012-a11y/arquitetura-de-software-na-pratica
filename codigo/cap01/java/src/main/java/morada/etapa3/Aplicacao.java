// Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
package morada.etapa3;

import java.time.LocalDate;

public final class Aplicacao {

    private Aplicacao() {}

    public static RelatorioDeCobrancas gerarCobrancaMensal(
        DadosDoCondominio dados,
        LocalDate hoje,
        MeioDePagamento pagamento,
        Notificador notificador
    ) {
        DadosDoCondominio.Condominio condominio = dados.condominio();
        Competencia competencia = Competencia.de(hoje);
        RelatorioDeCobrancas relatorio = new RelatorioDeCobrancas(
            condominio.nome(),
            competencia
        );
        for (Unidade unidade : dados.unidades()) {
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
