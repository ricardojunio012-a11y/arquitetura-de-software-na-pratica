// Serviço de aplicação: traduz um comando em chamadas ao domínio. Carrega o
// agregado, pede o trabalho a ele, salva e publica os eventos. Sem regra de negócio.
package morada.depois.aplicacao;

import java.util.function.Consumer;
import morada.depois.dominio.Agenda;
import morada.depois.dominio.ErroDeDominio;
import morada.depois.dominio.EventoDeDominio;
import morada.depois.dominio.Periodo;

public class ServicoDeReservas {

    public record Comando(
        String tipo,
        String reserva,
        String em,
        String unidade,
        String espaco,
        String data,
        int inicio,
        int fim
    ) {}

    public record Resultado(
        String reserva,
        String comando,
        String situacao,
        String detalhe
    ) {}

    private final AgendasEmMemoria agendas;
    private final Consumer<EventoDeDominio> publicar;

    public ServicoDeReservas(
        AgendasEmMemoria agendas,
        Consumer<EventoDeDominio> publicar
    ) {
        this.agendas = agendas;
        this.publicar = publicar;
    }

    public Resultado executar(Comando c) {
        try {
            return c.tipo().equals("reservar") ? reservar(c) : cancelar(c);
        } catch (ErroDeDominio erro) {
            String situacao = c.tipo().equals("reservar")
                ? "recusada"
                : "não cancelada";
            return new Resultado(c.reserva(), c.tipo(), situacao, erro.getMessage());
        }
    }

    private Resultado reservar(Comando c) {
        Periodo periodo = new Periodo(c.data(), c.inicio(), c.fim());
        Agenda agenda = agendas.doEspaco(c.espaco());
        var reserva = agenda.reservar(c.reserva(), c.unidade(), periodo, c.em());
        salvar(agenda);
        return new Resultado(
            c.reserva(),
            c.tipo(),
            "confirmada",
            reserva.taxa().toString()
        );
    }

    private Resultado cancelar(Comando c) {
        Agenda agenda = agendas.daReserva(c.reserva());
        var multa = agenda.cancelar(c.reserva(), c.em());
        salvar(agenda);
        String detalhe = multa.centavos() > 0 ? "multa " + multa : "sem multa";
        return new Resultado(c.reserva(), c.tipo(), "cancelada", detalhe);
    }

    private void salvar(Agenda agenda) {
        agendas.salvar(agenda);
        agenda.recolherEventos().forEach(publicar);
    }
}
