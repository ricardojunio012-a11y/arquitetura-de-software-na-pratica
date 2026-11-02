// Evento de integração publicado pelo Financeiro. Carrega os dados de que os
// assinantes precisam (transferência de estado), para que não tenham de consultá-lo.
package morada;

public final class Eventos {

    private Eventos() {}

    public record Pagamento(
        String pagamento,
        String unidade,
        String reserva,
        long valorCentavos,
        String falha
    ) {}

    public record PagamentoConfirmado(
        String evento,
        String tipo,
        String pagamento,
        String unidade,
        String reserva,
        long valorCentavos
    ) {}

    // Identificador estável: o mesmo pagamento gera sempre o mesmo evento
    public static PagamentoConfirmado eventoDe(Pagamento p) {
        return new PagamentoConfirmado(
            "E-" + p.pagamento(),
            "PagamentoConfirmado",
            p.pagamento(),
            p.unidade(),
            p.reserva(),
            p.valorCentavos()
        );
    }

    public static String reais(long centavos) {
        String inteiro = String.format("%,d", centavos / 100).replace(',', '.');
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }
}
