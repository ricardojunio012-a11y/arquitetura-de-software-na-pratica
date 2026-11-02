// A cobrança de uma unidade. Especialista na informação (GRASP): quem tem os
// lançamentos é quem calcula os totais.
package morada.depois.cobranca;

import java.util.List;

public record Cobranca(String unidade, String morador, List<Lancamento> lancamentos) {
    public Cobranca {
        lancamentos = List.copyOf(lancamentos);
    }

    public long total() {
        return soma(false);
    }

    // Desconto condicional, em valor positivo
    public long desconto() {
        return -soma(true);
    }

    private long soma(boolean condicional) {
        return lancamentos
            .stream()
            .filter(l -> l.condicional() == condicional)
            .mapToLong(Lancamento::valor)
            .sum();
    }
}
