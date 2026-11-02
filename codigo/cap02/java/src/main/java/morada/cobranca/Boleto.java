// Código fictício: num sistema real, viria do banco emissor.
package morada.cobranca;

public class Boleto implements MeioDePagamento {

    @Override
    public String nome() {
        return "Boleto";
    }

    @Override
    public String gerarCodigo(
        String condominioId,
        Competencia competencia,
        Cobranca cobranca
    ) {
        return (
            "BOL-" +
            condominioId +
            "-" +
            competencia.codigo() +
            "-" +
            cobranca.unidade().id() +
            "-" +
            cobranca.total()
        );
    }
}
