// Um item da cobrança. Condicional: só vale para pagamento até a data do desconto.
package morada.depois.cobranca;

import java.util.List;

public record Lancamento(
    String codigo,
    String descricao,
    long valor,
    boolean condicional
) {
    public Lancamento(String codigo, String descricao, long valor) {
        this(codigo, descricao, valor, false);
    }

    public static long valorDe(List<Lancamento> lancados, String codigo) {
        return lancados
            .stream()
            .filter(l -> l.codigo().equals(codigo))
            .mapToLong(Lancamento::valor)
            .sum();
    }
}
