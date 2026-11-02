// Eventos de domínio: fatos que já aconteceram, com o vocabulário do negócio.
package morada.depois.dominio;

public sealed interface EventoDeDominio {
    record ReservaConfirmada(
        String reserva,
        String espaco,
        Periodo periodo,
        String unidade,
        Dinheiro taxa
    ) implements EventoDeDominio {}

    record ReservaCancelada(
        String reserva,
        Dinheiro multa
    ) implements EventoDeDominio {}
}
