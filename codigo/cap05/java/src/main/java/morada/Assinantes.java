// Quem reage aos eventos de reserva. Cada um faz uma coisa e não conhece os outros.
package morada;

import static morada.Tipos.dataBr;
import static morada.Tipos.reais;

import java.util.List;
import morada.Eventos.Assinante;
import morada.Eventos.Evento;
import morada.Notificacao.FabricaDeCanais;
import morada.Notificacao.Mensagem;

public final class Assinantes {

    private Assinantes() {}

    public record NotificarMorador(FabricaDeCanais fabrica) implements Assinante {
        public String nome() {
            return "NotificarMorador";
        }

        public void tratar(Evento evento) {
            var p = evento.pedido();
            String quando = p.espaco().nome() + " em " + dataBr(p.data());
            Mensagem mensagem = evento.tipo().equals("ReservaConfirmada")
                ? new Mensagem(
                      "Reserva confirmada",
                      quando +
                          ". Taxa de uso: R$ " +
                          reais(p.espaco().taxaCentavos()) +
                          "."
                  )
                : new Mensagem(
                      "Reserva recusada",
                      quando + ": " + evento.motivo() + "."
                  );
            var morador = p.unidade().morador();
            fabrica.para(morador).enviar(morador, mensagem);
        }
    }

    public record LancarTaxaDeUso(List<String> taxas) implements Assinante {
        public String nome() {
            return "LancarTaxaDeUso";
        }

        public void tratar(Evento evento) {
            var p = evento.pedido();
            String descricao =
                "Taxa de uso: " + p.espaco().nome() + " em " + dataBr(p.data());
            taxas.add(
                p.unidade().id() +
                    ";" +
                    descricao +
                    ";" +
                    reais(p.espaco().taxaCentavos())
            );
        }
    }

    public record AvisarPortaria(List<String> lista) implements Assinante {
        public String nome() {
            return "AvisarPortaria";
        }

        public void tratar(Evento evento) {
            var p = evento.pedido();
            lista.add(
                dataBr(p.data()) +
                    " " +
                    p.espaco().nome() +
                    ": " +
                    p.unidade().id() +
                    " " +
                    p.unidade().morador().nome()
            );
        }
    }
}
