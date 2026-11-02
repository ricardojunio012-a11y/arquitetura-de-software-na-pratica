// Como o morador paga. O cálculo não sabe que meio é esse.
package morada.etapa3;

public interface MeioDePagamento {
    String nome();

    String gerarCodigo(String condominioId, Competencia competencia, Cobranca cobranca);
}
