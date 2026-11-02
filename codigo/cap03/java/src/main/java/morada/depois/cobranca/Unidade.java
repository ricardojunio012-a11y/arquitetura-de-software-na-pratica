// Os dados de uma unidade de que a cobrança precisa.
package morada.depois.cobranca;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Unidade(
    String id,
    long fracaoMilionesimos,
    Morador morador,
    Debito debitoAnterior
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Morador(String nome) {}

    public record Debito(long valorCentavos, String vencimento) {}
}
