// Testes: cada padrão isolado, com dublês no lugar dos provedores.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import morada.Aprovacao.AntecedenciaMinima;
import morada.Aprovacao.UnidadeEmDia;
import morada.Estado.Reserva;
import morada.Eventos.Assinante;
import morada.Eventos.Barramento;
import morada.Eventos.Evento;
import morada.Notificacao.ComRegistro;
import morada.Notificacao.ComRetentativas;
import morada.Notificacao.Email;
import morada.Notificacao.FabricaDeCanais;
import morada.Notificacao.Mensagem;
import morada.Notificacao.ProvedorSimulado;
import morada.Notificacao.Sms;
import morada.Tipos.Decisao;
import morada.Tipos.Espaco;
import morada.Tipos.Morador;
import morada.Tipos.Pedido;
import morada.Tipos.Unidade;
import org.junit.jupiter.api.Test;

class PadroesTest {

    static final Morador MORADOR = new Morador("Diego", "d@x.com", "sms", "+55");
    static final Espaco SALAO = new Espaco("salao", "Salão", 15000, 2, 1);

    static Pedido pedido(boolean emDebito, String data) {
        return new Pedido("R-1", new Unidade("A-1", emDebito, MORADOR), SALAO, data);
    }

    @Test
    void decoratorRetentativasPorForaERegistroPorDentro() {
        var provedor = new ProvedorSimulado(Map.of("+55", 2));
        List<String> registro = new ArrayList<>();
        List<Long> esperas = new ArrayList<>();
        var canal = new ComRetentativas(
            new ComRegistro(new Sms(provedor), registro),
            3,
            (ms, quem) -> esperas.add(ms)
        );
        canal.enviar(MORADOR, new Mensagem("Teste", "olá"));
        assertEquals(
            List.of(
                "sms para Diego: falhou (provedor indisponível)",
                "sms para Diego: falhou (provedor indisponível)",
                "sms para Diego: entregue (Teste)"
            ),
            registro
        );
        assertEquals(List.of(100L, 200L), esperas); // espera crescente
    }

    @Test
    void decoratorFalhaDefinitivaNaoERepetida() {
        var provedor = new ProvedorSimulado(Map.of(), List.of("d@x.com"));
        List<String> registro = new ArrayList<>();
        var canal = new ComRetentativas(
            new ComRegistro(new Email(provedor), registro),
            3,
            (ms, quem) -> {}
        );
        var erro = assertThrows(IllegalStateException.class, () ->
            canal.enviar(MORADOR, new Mensagem("Teste", "olá"))
        );
        assertTrue(erro.getMessage().contains("sem nova tentativa"));
        assertEquals(1, registro.size());
    }

    @Test
    void stateAReservaAceitaSoAsTransicoesDoEstado() {
        var reserva = new Reserva(pedido(false, "2026-03-03"));
        reserva.aprovar();
        reserva.cancelar();
        assertEquals("cancelada", reserva.estado());
        var erro = assertThrows(IllegalStateException.class, reserva::aprovar);
        assertEquals("não é possível aprovar uma reserva cancelada", erro.getMessage());
    }

    @Test
    void repositorySalvarSeLivreRecusaOSegundoPedido() {
        var reservas = new Repositorio.EmMemoria();
        var primeira = new Reserva(pedido(false, "2026-03-03"));
        assertTrue(reservas.salvarSeLivre(primeira));
        primeira.aprovar();
        assertFalse(reservas.salvarSeLivre(new Reserva(pedido(false, "2026-03-03"))));
    }

    @Test
    void factoryEscolhePeloCanalEUsaEmailSeNaoConhecer() {
        var fabrica = new FabricaDeCanais(
            new ProvedorSimulado(Map.of()),
            new ArrayList<>(),
            (ms, quem) -> {}
        );
        assertEquals("sms", fabrica.para(MORADOR).nome());
        var pombo = new Morador("Diego", "d@x.com", "pombo-correio", "+55");
        assertEquals("email", fabrica.para(pombo).nome());
    }

    @Test
    void chainAPrimeiraEtapaQueRecusaDecideOMotivo() {
        var cadeia = new UnidadeEmDia();
        cadeia.depois(new AntecedenciaMinima(LocalDate.of(2026, 3, 2)));
        assertEquals(
            "unidade com débito em aberto",
            cadeia.avaliar(pedido(true, "2026-03-03")).motivo()
        );
        assertEquals(
            "antecedência mínima de 2 dias",
            cadeia.avaliar(pedido(false, "2026-03-03")).motivo()
        );
        assertEquals(Decisao.aprovar(), cadeia.avaliar(pedido(false, "2026-03-10")));
    }

    @Test
    void observerUmAssinanteQueFalhaNaoImpedeOsOutros() {
        var eventos = new Barramento();
        List<String> recebidos = new ArrayList<>();
        eventos.assinar(
            "ReservaConfirmada",
            new Assinante() {
                public String nome() {
                    return "Quebrado";
                }

                public void tratar(Evento evento) {
                    throw new IllegalStateException("fora do ar");
                }
            }
        );
        eventos.assinar(
            "ReservaConfirmada",
            new Assinante() {
                public String nome() {
                    return "Portaria";
                }

                public void tratar(Evento evento) {
                    recebidos.add(evento.pedido().id());
                }
            }
        );
        eventos.publicar(
            new Evento("ReservaConfirmada", pedido(false, "2026-03-10"), null)
        );
        assertEquals(List.of("R-1"), recebidos);
        assertEquals(
            List.of("ReservaConfirmada R-1: Quebrado: fora do ar"),
            eventos.falhas
        );
    }
}
