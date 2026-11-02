// Novo meio de pagamento: entra sem mexer no cálculo nem no boleto.
// Código fictício: num sistema real, viria do provedor de Pix.
package morada.etapa4;

public class Pix implements MeioDePagamento {

    @Override
    public String nome() {
        return "Pix copia e cola";
    }

    @Override
    public String gerarCodigo(
        String condominioId,
        Competencia competencia,
        Cobranca cobranca
    ) {
        return (
            "PIX-" +
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
