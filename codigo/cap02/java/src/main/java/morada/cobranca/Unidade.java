// Os dados de uma unidade, como chegam do cadastro.
package morada.cobranca;

public record Unidade(
    String id,
    long fracaoMilionesimos,
    Morador morador,
    String meioPagamento,
    DebitoAnterior debitoAnterior // null quando não há débito
) {
    public record Morador(String nome, String email, String telefone, String canal) {}

    public record DebitoAnterior(long valorCentavos, String vencimento) {}
}
