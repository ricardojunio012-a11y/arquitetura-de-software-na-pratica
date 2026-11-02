// Os dados de uma unidade de que as regras precisam.
package morada.depois.cobranca;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Unidade(
    String id,
    long fracaoMilionesimos,
    Morador morador,
    boolean sindico,
    Debito debitoAnterior
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Morador(String nome) {}

    public record Debito(long valorCentavos, String vencimento) {}
}
