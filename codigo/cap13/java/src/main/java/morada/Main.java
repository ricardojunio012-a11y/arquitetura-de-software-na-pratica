// Uso: java morada.Main online|offline|reinicio|persistida <pasta-de-saída>
// Simula uma manhã na portaria com dois tablets. Na versão offline, o tablet A perde
// a internet, trabalha com a fila local e sincroniza ao voltar.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import morada.Backend.Convidado;
import morada.Backend.Encomenda;
import morada.Backend.Portaria;
import morada.Backend.Reservas;
import morada.Backend.Visitante;

public class Main {

    static String texto(JsonNode no, String campo) {
        return no.has(campo) ? no.get(campo).asText() : null;
    }

    public static void main(String[] args) throws Exception {
        String versao = args[0];
        JsonNode cenario = new ObjectMapper().readTree(
            Path.of("/dados/entrada/cenario.json").toFile()
        );
        List<Encomenda> encomendas = new ArrayList<>();
        for (JsonNode e : cenario.get("encomendas")) {
            encomendas.add(new Encomenda(texto(e, "encomenda"), texto(e, "unidade")));
        }
        List<Convidado> convidados = new ArrayList<>();
        for (JsonNode f : cenario.get("convidados")) {
            for (JsonNode nome : f.get("nomes")) {
                convidados.add(
                    new Convidado(
                        nome.asText(),
                        texto(f, "reserva"),
                        texto(f, "espaco")
                    )
                );
            }
        }
        var portaria = new Portaria(encomendas);
        var reservas = new Reservas(convidados);
        // Na versão persistida, o resultado de cada operação vai para uma tabela que
        // sobrevive ao processo do BFF; nas outras, fica só na memória dele
        Map<String, String> tabelaDeOperacoes = new HashMap<>();
        Supplier<BffPorteiro> novoBff = () ->
            new BffPorteiro(
                portaria,
                reservas,
                versao.equals("persistida") ? tabelaDeOperacoes : new HashMap<>()
            );
        BffPorteiro[] bff = { novoBff.get() };
        List<String> registro = new ArrayList<>();
        var tablets = Map.of(
            "A",
            new Tablet("A", () -> bff[0], registro),
            "B",
            new Tablet("B", () -> bff[0], registro)
        );

        for (JsonNode passo : cenario.get("passos")) {
            if (passo.has("so")) {
                boolean vale = false;
                for (JsonNode v : passo.get("so")) vale |= v.asText().equals(versao);
                if (!vale) continue;
            }
            if (texto(passo, "acao").equals("reiniciarBff")) {
                bff[0] = novoBff.get();
                registro.add(
                    "o BFF reiniciou: o que estava só na memória dele se perdeu"
                );
                continue;
            }
            Tablet tablet = tablets.get(texto(passo, "tablet"));
            switch (texto(passo, "acao")) {
                case "abrir" -> tablet.abrir();
                case "desconectar" -> tablet.desconectar();
                case "reconectar" -> tablet.reconectar(
                    passo.get("perderResposta").asBoolean()
                );
                case "reenviar" -> tablet.reenviar();
                default -> tablet.operar(
                    texto(passo, "acao"),
                    texto(passo, "hora"),
                    texto(passo, "encomenda"),
                    texto(passo, "nome"),
                    texto(passo, "reserva")
                );
            }
        }

        List<String> estado = new ArrayList<>();
        for (Encomenda e : portaria.encomendas.values()) {
            String base = e.encomenda + " " + e.unidade + ": " + e.situacao;
            estado.add(
                e.por == null ? base : base + " pelo tablet " + e.por + " às " + e.hora
            );
        }
        for (Visitante v : portaria.visitantes) {
            estado.add(
                v.nome() +
                    " (" +
                    v.reserva() +
                    ") entrou às " +
                    v.hora() +
                    " pelo tablet " +
                    v.tablet()
            );
        }
        estado.add("operações repetidas ignoradas: " + bff[0].repetidas);

        Path pasta = Path.of(args[1], versao);
        Files.createDirectories(pasta);
        Files.writeString(
            pasta.resolve("registro.txt"),
            String.join("\n", registro) + "\n"
        );
        Files.writeString(
            pasta.resolve("estado.txt"),
            String.join("\n", estado) + "\n"
        );
        System.out.println(versao + ": saída em " + pasta);
    }
}
