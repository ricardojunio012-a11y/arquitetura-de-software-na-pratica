// Simula a API de um provedor de Pix. Outra empresa, outro formato: valores em
// centavos, datas ISO e um identificador (txid) escolhido por quem cria a cobrança.
package morada.externos;

public class PagaFacilApi {

    public record CobrancaPix(
        String txid,
        long valorCentavos,
        String expiraEm,
        Long descontoCentavos,
        String descontoAte
    ) {}

    public record Resposta(String txid, String status) {}

    public Resposta criarCobranca(CobrancaPix cobranca) {
        if (cobranca.valorCentavos() <= 0) {
            throw new IllegalArgumentException("valor inválido");
        }
        return new Resposta(cobranca.txid(), "ATIVA");
    }
}
