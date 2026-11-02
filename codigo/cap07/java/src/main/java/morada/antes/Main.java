// Uso: java morada.antes.Main <comandos.json> <pasta-de-saída>
package morada.antes;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import morada.antes.Modelo.Reserva;

public class Main {

    public static void main(String[] args) throws Exception {
        JsonNode dados = new ObjectMapper().readTree(Path.of(args[0]).toFile());
        Map<String, JsonNode> espacos = new LinkedHashMap<>();
        for (JsonNode e : dados.get("espacos")) espacos.put(e.get("id").asText(), e);
        List<String> eventos = new ArrayList<>();
        List<String> resultados = new ArrayList<>();
        for (JsonNode c : dados.get("comandos")) {
            String tipo = c.get("tipo").asText();
            String r = tipo.equals("reservar")
                ? Servico.reservar(c, espacos.get(c.get("espaco").asText()), eventos)
                : Servico.cancelar(c, eventos);
            resultados.add(c.get("reserva").asText() + ";" + tipo + ";" + r);
        }
        List<String> agenda = new ArrayList<>();
        for (String espaco : espacos.keySet()) {
            for (Reserva r : Modelo.reservas) {
                if (r.espaco.equals(espaco) && r.situacao.equals("confirmada")) {
                    String periodo = r.data + " " + r.inicio + "h-" + r.fim + "h";
                    agenda.add(r.espaco + ";" + r.id + ";" + periodo + ";" + r.unidade);
                }
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
