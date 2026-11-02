// Uso: java morada.Main memoria|escrita-dupla|outbox <pasta-de-saída>
// O Financeiro confirma três pagamentos; Reservas e Comunicação reagem ao evento.
package morada;

import static morada.Eventos.eventoDe;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import morada.Eventos.Pagamento;
import morada.Eventos.PagamentoConfirmado;
import morada.infra.Banco;
import morada.infra.Broker;
import morada.modulos.Comunicacao;
import morada.modulos.Reservas;
import morada.modulos.Reservas.Reserva;

public class Main {

    record Cenario(List<Reserva> reservas, List<Pagamento> pagamentos) {}

    // O cenário tem campos que o Java não usa (como o pagamento de cada reserva)
    static final ObjectMapper JSON = new ObjectMapper().configure(
        DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
        false
    );
    static final List<String> execucao = new ArrayList<>();
    static Reservas reservas;
    static final Comunicacao comunicacao = new Comunicacao();

    public static void main(String[] args) throws Exception {
        String versao = args[0];
        Cenario cenario = JSON.readValue(
            Path.of("/dados/entrada/cenario.json").toFile(),
            Cenario.class
        );
        reservas = new Reservas(cenario.reservas());
        if (versao.equals("memoria")) rodarEmMemoria(cenario.pagamentos());
        else rodarComBroker(cenario.pagamentos(), versao.equals("outbox"));

        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        List<String> consumo = new ArrayList<>(reservas.registro);
        consumo.addAll(comunicacao.registro);
        List<String> resultado = new ArrayList<>(reservas.linhas());
        resultado.addAll(comunicacao.avisos);
        gravar(saida.resolve("execucao.txt"), execucao);
        gravar(saida.resolve("consumo.txt"), consumo);
        gravar(saida.resolve("resultado.txt"), resultado);
        System.out.println(versao + ": saída em " + saida);
    }

    static void gravar(Path arquivo, List<String> linhas) throws Exception {
        Files.writeString(arquivo, String.join("\n", linhas) + "\n");
    }

    // Barramento em memória: os assinantes rodam na hora, no mesmo processo
    static void rodarEmMemoria(List<Pagamento> pagamentos) {
        for (Pagamento p : pagamentos) {
            var e = eventoDe(p);
            execucao.add(
                p.pagamento() + " confirmado; " + e.evento() + " entregue em memória"
            );
            reservas.aoConfirmarPagamento(e);
            comunicacao.aoConfirmarPagamento(e);
        }
    }

    static void rodarComBroker(List<Pagamento> pagamentos, boolean comOutbox)
        throws Exception {
        Connection banco = Banco.conectar();
        var broker = Broker.conectar();
        Channel canal = broker.canal();
        for (Pagamento p : pagamentos) {
            var e = eventoDe(p);
            if (comOutbox) {
                Banco.gravarComOutbox(banco, p, e);
                execucao.add(
                    p.pagamento() + " gravado com " + e.evento() + " na outbox"
                );
                continue;
            }
            // Escrita dupla: grava no banco e depois publica, em dois passos separados
            Banco.gravarPagamento(banco, p);
            if ("depois-de-gravar".equals(p.falha())) {
                execucao.add(
                    p.pagamento() + " gravado; o processo caiu antes de publicar"
                );
                continue;
            }
            Broker.publicar(canal, e);
            execucao.add(p.pagamento() + " gravado; " + e.evento() + " publicado");
        }
        if (comOutbox) {
            Set<String> caiAntesDeMarcar = new HashSet<>();
            for (Pagamento p : pagamentos) {
                if ("relay-antes-de-marcar".equals(p.falha())) {
                    caiAntesDeMarcar.add("E-" + p.pagamento());
                }
            }
            rodarRelay(banco, canal, caiAntesDeMarcar);
            rodarRelay(banco, canal, caiAntesDeMarcar);
        }
        Broker.consumirTudo(canal, Broker.FILAS.get(0), reservas::aoConfirmarPagamento);
        Broker.consumirTudo(
            canal,
            Broker.FILAS.get(1),
            comunicacao::aoConfirmarPagamento
        );
        broker.conexao().close();
        banco.close();
    }

    // O relay lê a outbox e publica o que falta; só marca como publicado depois
    static void rodarRelay(Connection banco, Channel canal, Set<String> caiAntes)
        throws Exception {
        String sql =
            "SELECT id, evento, conteudo FROM outbox WHERE NOT publicado ORDER BY id";
        try (
            var consulta = banco.createStatement();
            var linhas = consulta.executeQuery(sql)
        ) {
            while (linhas.next()) {
                String evento = linhas.getString("evento");
                var e = JSON.readValue(
                    linhas.getString("conteudo"),
                    PagamentoConfirmado.class
                );
                Broker.publicar(canal, e);
                if (caiAntes.remove(evento)) {
                    execucao.add(
                        "relay publicou " + evento + " e caiu antes de marcar"
                    );
                    return;
                }
                try (
                    var marcar = banco.prepareStatement(
                        "UPDATE outbox SET publicado = true WHERE id = ?"
                    )
                ) {
                    marcar.setInt(1, linhas.getInt("id"));
                    marcar.executeUpdate();
                }
                execucao.add("relay publicou " + evento);
            }
        }
    }
}
