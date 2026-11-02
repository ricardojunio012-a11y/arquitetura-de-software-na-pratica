// Uso: java morada.depois.Main <comandos.json> <pasta-de-saída>
// Monta o repositório e o serviço de aplicação e executa os comandos em ordem.
package morada.depois;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.depois.aplicacao.AgendasEmMemoria;
import morada.depois.aplicacao.ServicoDeReservas;
import morada.depois.aplicacao.ServicoDeReservas.Comando;
import morada.depois.dominio.Agenda.PoliticaDeUso;
import morada.depois.dominio.Dinheiro;
import morada.depois.dominio.EventoDeDominio;
import morada.depois.dominio.EventoDeDominio.ReservaCancelada;
import morada.depois.dominio.EventoDeDominio.ReservaConfirmada;

public class Main {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Espaco(
        String id,
        long taxaCentavos,
        int antecedenciaMinimaDias,
        int limitePorMes
    ) {}

    record Dados(List<Espaco> espacos, List<Comando> comandos) {}

    static String formatar(EventoDeDominio e) {
        return switch (e) {
            case ReservaConfirmada c -> "ReservaConfirmada;" +
                c.reserva() +
                ";" +
                c.espaco() +
                ";" +
                c.periodo() +
                ";" +
                c.unidade() +
                ";" +
                c.taxa();
            case ReservaCancelada c -> "ReservaCancelada;" +
                c.reserva() +
                ";" +
                (c.multa().centavos() > 0 ? "multa " + c.multa() : "sem multa");
        };
    }

    public static void main(String[] args) throws Exception {
        Dados dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            Dados.class
        );
        Map<String, PoliticaDeUso> politicas = new LinkedHashMap<>();
        for (Espaco e : dados.espacos()) {
            politicas.put(
                e.id(),
                new PoliticaDeUso(
                    new Dinheiro(e.taxaCentavos()),
                    e.antecedenciaMinimaDias(),
                    e.limitePorMes()
                )
            );
        }

        List<String> eventos = new ArrayList<>();
        var agendas = new AgendasEmMemoria(politicas);
        var servico = new ServicoDeReservas(agendas, e -> eventos.add(formatar(e)));
        List<String> resultados = new ArrayList<>();
        for (Comando c : dados.comandos()) {
            var r = servico.executar(c);
            resultados.add(
                r.reserva() + ";" + r.comando() + ";" + r.situacao() + ";" + r.detalhe()
            );
        }
        List<String> agenda = new ArrayList<>();
        for (var a : agendas.todas()) {
            for (var r : a.ativas()) {
                agenda.add(
                    a.espaco() + ";" + r.id() + ";" + r.periodo() + ";" + r.unidade()
                );
            }
        }

        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Map<String, List<String>> arquivos = new LinkedHashMap<>();
        arquivos.put("resultados", resultados);
        arquivos.put("eventos", eventos);
        arquivos.put("agenda", agenda);
        for (var a : arquivos.entrySet()) {
            Files.writeString(
                saida.resolve(a.getKey() + ".txt"),
                String.join("\n", a.getValue()) + "\n"
            );
        }
        System.out.println(
            resultados.size() + " comandos executados; saída em " + saida
        );
    }
}
