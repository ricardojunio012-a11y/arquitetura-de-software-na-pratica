// Strategy (os canais), Decorator (retentativas e registro) e Factory (a fábrica).
package morada;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import morada.Tipos.Morador;

public final class Notificacao {

    private Notificacao() {}

    public record Mensagem(String titulo, String texto) {}

    public interface Canal {
        String nome();

        void enviar(Morador morador, Mensagem mensagem);
    }

    // Falha que pode passar numa nova tentativa (provedor fora do ar, limite de uso)
    public static class ErroPassageiro extends RuntimeException {

        public ErroPassageiro(String mensagem) {
            super(mensagem);
        }
    }

    // Falha que se repete em toda tentativa (endereço inexistente, número inválido)
    public static class ErroDefinitivo extends RuntimeException {

        public ErroDefinitivo(String mensagem) {
            super(mensagem);
        }
    }

    // Quem espera entre as tentativas: em produção, um timer; no laboratório, um
    // relógio simulado que só anota a espera, para a saída ser sempre a mesma
    public interface Esperar {
        void esperar(long ms, String quem);
    }

    // Simula os provedores de e-mail, WhatsApp e SMS. Alguns destinos falham
    // nas primeiras tentativas, como acontece com provedores de verdade, e
    // outros são inválidos e falham sempre.
    public static class ProvedorSimulado {

        private final Map<String, Integer> falhas;
        private final Set<String> invalidos;
        public final List<String> entregues = new ArrayList<>();

        public ProvedorSimulado(Map<String, Integer> falhas) {
            this(falhas, List.of());
        }

        public ProvedorSimulado(Map<String, Integer> falhas, List<String> invalidos) {
            this.falhas = new HashMap<>(falhas);
            this.invalidos = new HashSet<>(invalidos);
        }

        public void entregar(String canal, String destino, String texto) {
            if (invalidos.contains(destino)) {
                throw new ErroDefinitivo("destino inexistente");
            }
            int restantes = falhas.getOrDefault(destino, 0);
            if (restantes > 0) {
                falhas.put(destino, restantes - 1);
                throw new ErroPassageiro("provedor indisponível");
            }
            entregues.add(canal + " " + destino + " | " + texto);
        }
    }

    // Cada estratégia sabe o endereço e o formato do seu canal
    public record Email(ProvedorSimulado provedor) implements Canal {
        public String nome() {
            return "email";
        }

        public void enviar(Morador morador, Mensagem m) {
            provedor.entregar(nome(), morador.email(), m.titulo() + ": " + m.texto());
        }
    }

    public record WhatsApp(ProvedorSimulado provedor) implements Canal {
        public String nome() {
            return "whatsapp";
        }

        public void enviar(Morador morador, Mensagem m) {
            String texto = "*" + m.titulo() + "* " + m.texto();
            provedor.entregar(nome(), morador.telefone(), texto);
        }
    }

    public record Sms(ProvedorSimulado provedor) implements Canal {
        public String nome() {
            return "sms";
        }

        // SMS é curto: só o título, e o detalhe fica no aplicativo
        public void enviar(Morador morador, Mensagem m) {
            provedor.entregar(nome(), morador.telefone(), "Morada: " + m.titulo());
        }
    }

    // Decorator: registra cada tentativa sem que o canal saiba que é observado
    public record ComRegistro(Canal canal, List<String> registro) implements Canal {
        public String nome() {
            return canal.nome();
        }

        public void enviar(Morador morador, Mensagem mensagem) {
            String quem = nome() + " para " + morador.nome();
            try {
                canal.enviar(morador, mensagem);
                registro.add(quem + ": entregue (" + mensagem.titulo() + ")");
            } catch (RuntimeException erro) {
                registro.add(quem + ": falhou (" + erro.getMessage() + ")");
                throw erro;
            }
        }
    }

    // Decorator: tenta de novo antes de desistir, só quando a falha é passageira,
    // e espera cada vez mais entre as tentativas (100 ms, 200 ms, 400 ms...)
    public record ComRetentativas(
        Canal canal,
        int tentativas,
        Esperar esperar,
        long esperaInicialMs
    ) implements Canal {
        public ComRetentativas(Canal canal, int tentativas, Esperar esperar) {
            this(canal, tentativas, esperar, 100);
        }

        public String nome() {
            return canal.nome();
        }

        public void enviar(Morador morador, Mensagem mensagem) {
            for (int tentativa = 1; ; tentativa++) {
                try {
                    canal.enviar(morador, mensagem);
                    return;
                } catch (ErroPassageiro erro) {
                    if (tentativa == tentativas) {
                        throw new IllegalStateException(
                            nome() + " sem sucesso após " + tentativa + " tentativas"
                        );
                    }
                    long espera = esperaInicialMs * (1L << (tentativa - 1));
                    esperar.esperar(espera, nome() + " para " + morador.nome());
                } catch (RuntimeException erro) {
                    // Repetir uma falha definitiva só gasta tempo e cota do provedor
                    throw new IllegalStateException(
                        nome() +
                            " falhou sem nova tentativa (" +
                            erro.getMessage() +
                            ")"
                    );
                }
            }
        }
    }

    // Factory: escolhe a estratégia pela preferência do morador e a embrulha nos
    // decoradores. Quem envia avisos não conhece nenhuma classe concreta.
    public static class FabricaDeCanais {

        private final Map<String, Canal> canais = new HashMap<>();
        private final List<String> registro;
        private final Esperar esperar;

        public FabricaDeCanais(
            ProvedorSimulado provedor,
            List<String> registro,
            Esperar esperar
        ) {
            this.esperar = esperar;
            for (Canal c : List.of(
                new Email(provedor),
                new WhatsApp(provedor),
                new Sms(provedor)
            )) {
                canais.put(c.nome(), c);
            }
            this.registro = registro;
        }

        public Canal para(Morador morador) {
            Canal canal = canais.getOrDefault(morador.canal(), canais.get("email"));
            // A ordem importa: retentativas por fora, registro por dentro
            return new ComRetentativas(new ComRegistro(canal, registro), 3, esperar);
        }
    }
}
