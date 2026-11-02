// O broker (RabbitMQ): uma exchange do tipo fanout entrega cada evento às filas de
// Reservas e de Comunicação. Cada módulo tem a sua fila e consome no seu ritmo.
package morada.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import java.util.List;
import java.util.function.Consumer;
import morada.Eventos.PagamentoConfirmado;

public class Broker {

    public static final List<String> FILAS = List.of(
        "reservas.pagamentos",
        "comunicacao.pagamentos"
    );
    private static final ObjectMapper JSON = new ObjectMapper();

    public record Conectado(Connection conexao, Channel canal) {}

    public static Conectado conectar() throws Exception {
        var fabrica = new ConnectionFactory();
        fabrica.setUri(System.getenv("BROKER_URL"));
        Connection conexao = fabrica.newConnection();
        Channel canal = conexao.createChannel();
        canal.confirmSelect();
        canal.exchangeDeclare("pagamentos", "fanout", true);
        for (String fila : FILAS) {
            canal.queueDeclare(fila, true, false, false, null);
            canal.queuePurge(fila);
            canal.queueBind(fila, "pagamentos", "");
        }
        return new Conectado(conexao, canal);
    }

    // Só considera publicado depois que o broker confirma o recebimento
    public static void publicar(Channel canal, PagamentoConfirmado e) throws Exception {
        var propriedades = new AMQP.BasicProperties.Builder()
            .deliveryMode(2)
            .messageId(e.evento())
            .build();
        canal.basicPublish("pagamentos", "", propriedades, JSON.writeValueAsBytes(e));
        canal.waitForConfirmsOrDie(5000);
    }

    // Consome a fila até esvaziar; a confirmação (ack) vem depois do tratamento
    public static void consumirTudo(
        Channel canal,
        String fila,
        Consumer<PagamentoConfirmado> tratar
    ) throws Exception {
        for (;;) {
            var resposta = canal.basicGet(fila, false);
            if (resposta == null) return;
            tratar.accept(
                JSON.readValue(resposta.getBody(), PagamentoConfirmado.class)
            );
            canal.basicAck(resposta.getEnvelope().getDeliveryTag(), false);
        }
    }
}
