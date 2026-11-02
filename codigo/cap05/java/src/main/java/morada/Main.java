// Uso: java morada.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os objetos e processa os pedidos de reserva na ordem em que chegaram.
package morada;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import morada.Aprovacao.AntecedenciaMinima;
import morada.Aprovacao.EspacoLivre;
import morada.Aprovacao.Etapa;
import morada.Aprovacao.LimitePorMes;
import morada.Aprovacao.UnidadeEmDia;
import morada.Assinantes.AvisarPortaria;
import morada.Assinantes.LancarTaxaDeUso;
import morada.Assinantes.NotificarMorador;
import morada.Eventos.Barramento;
import morada.Notificacao.Esperar;
import morada.Notificacao.FabricaDeCanais;
import morada.Notificacao.ProvedorSimulado;
import morada.Tipos.Espaco;
import morada.Tipos.Pedido;
import morada.Tipos.Unidade;

public class Main {

    record PedidoDeEntrada(String id, String unidade, String espaco, String data) {}

    record Dados(
        List<Espaco> espacos,
        List<Unidade> unidades,
        List<PedidoDeEntrada> pedidos,
        Map<String, Integer> falhasSimuladas,
        List<String> destinosInvalidos,
        List<String> cancelamentos,
        List<PedidoDeEntrada> pedidosSimultaneos
    ) {}

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        Dados dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            Dados.class
        );
        Map<String, Espaco> espacos = dados
            .espacos()
            .stream()
            .collect(Collectors.toMap(Espaco::id, Function.identity()));
        Map<String, Unidade> unidades = dados
            .unidades()
            .stream()
            .collect(Collectors.toMap(Unidade::id, Function.identity()));

        Function<Repositorio.EmMemoria, Etapa> montarAprovacao = r -> {
            var aprovacao = new UnidadeEmDia();
            aprovacao
                .depois(new AntecedenciaMinima(hoje))
                .depois(new EspacoLivre(r))
                .depois(new LimitePorMes(r));
            return aprovacao;
        };
        var reservas = new Repositorio.EmMemoria();
        var aprovacao = montarAprovacao.apply(reservas);

        var provedor = new ProvedorSimulado(
            dados.falhasSimuladas(),
            dados.destinosInvalidos()
        );
        List<String> notificacoes = new ArrayList<>();
        List<String> taxas = new ArrayList<>();
        List<String> portaria = new ArrayList<>();
        List<String> esperas = new ArrayList<>();
        // Relógio simulado: anota a espera em vez de esperar de verdade
        Esperar esperar = (ms, quem) -> esperas.add(quem + ": espera de " + ms + " ms");
        var fabrica = new FabricaDeCanais(provedor, notificacoes, esperar);
        var eventos = new Barramento();
        eventos.assinar("ReservaConfirmada", new LancarTaxaDeUso(taxas));
        eventos.assinar("ReservaConfirmada", new AvisarPortaria(portaria));
        eventos.assinar("ReservaConfirmada", new NotificarMorador(fabrica));
        eventos.assinar("ReservaRecusada", new NotificarMorador(fabrica));

        var servico = new ServicoDeReservas(aprovacao, reservas, eventos);
        List<String> decisoes = new ArrayList<>();
        for (PedidoDeEntrada p : dados.pedidos()) {
            var pedido = new Pedido(
                p.id(),
                unidades.get(p.unidade()),
                espacos.get(p.espaco()),
                p.data()
            );
            var d = servico.solicitar(pedido);
            String resultado = d.aprovada() ? "aprovada" : "recusada;" + d.motivo();
            decisoes.add(
                String.join(";", p.id(), p.unidade(), p.espaco(), p.data(), resultado)
            );
        }

        // State: cancelar depende do estado em que a reserva está
        List<String> cancelamentos = new ArrayList<>();
        for (String id : dados.cancelamentos()) {
            try {
                cancelamentos.add(id + ";" + servico.cancelar(id));
            } catch (IllegalStateException erro) {
                cancelamentos.add(id + ";erro;" + erro.getMessage());
            }
        }

        // Agora a parte difícil: dois pedidos ao mesmo tempo para o mesmo espaço e data
        List<Pedido> simultaneos = dados
            .pedidosSimultaneos()
            .stream()
            .map(p ->
                new Pedido(
                    p.id(),
                    unidades.get(p.unidade()),
                    espacos.get(p.espaco()),
                    p.data()
                )
            )
            .toList();
        List<String> concorrencia = Corrida.corrida(simultaneos, () -> {
            var novas = new Repositorio.EmMemoria();
            return new Corrida.Montagem(montarAprovacao.apply(novas), novas);
        });

        Map<String, List<String>> arquivos = new LinkedHashMap<>();
        arquivos.put("reservas", decisoes);
        arquivos.put("notificacoes", notificacoes);
        arquivos.put("enviados", provedor.entregues);
        arquivos.put("taxas", taxas);
        arquivos.put("portaria", portaria);
        arquivos.put("falhas", eventos.falhas);
        arquivos.put("esperas", esperas);
        arquivos.put("cancelamentos", cancelamentos);
        arquivos.put("concorrencia", concorrencia);
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        for (var arquivo : arquivos.entrySet()) {
            String texto = String.join("\n", arquivo.getValue()) + "\n";
            Files.writeString(saida.resolve(arquivo.getKey() + ".txt"), texto);
        }
        System.out.println(decisoes.size() + " pedidos processados; saída em " + saida);
    }
}
