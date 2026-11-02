// Uso: java morada.Contatos <pasta-de-saída>
// A parte difícil da extração. Para avisar, a Comunicação precisa do e-mail do
// morador, que pertence ao Cadastro e, no monólito, vinha de uma junção com a
// tabela dele. Fora do monólito, sem tabela compartilhada, há dois caminhos:
// consultar o Cadastro por API a cada aviso ou manter uma réplica dos contatos,
// alimentada pelos eventos ContatoAlterado. Um relógio simulado, em minutos,
// deixa a saída igual em qualquer máquina.
package morada;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class Contatos {

    record Mudanca(int minuto, String unidade, String email) {}

    static List<Mudanca> mudancas = new ArrayList<>();
    static int unidades, avisos, de, ate, atraso;

    static String unidadeDo(int aviso) {
        return String.format("U-%02d", ((aviso - 1) % unidades) + 1);
    }

    static boolean cadastroNoAr(int minuto) {
        return minuto < de || minuto > ate;
    }

    // O e-mail de uma unidade num minuto, contando as mudanças que já valiam
    static String emailEm(String unidade, int minuto, int atrasoDaCopia) {
        String email =
            "morador." + unidade.toLowerCase().replace("-", "") + "@exemplo.com";
        for (Mudanca m : mudancas) {
            if (m.unidade().equals(unidade) && m.minuto() + atrasoDaCopia <= minuto) {
                email = m.email();
            }
        }
        return email;
    }

    // Caminho 1: a cada aviso, pergunta o e-mail ao Cadastro. Se ele não responde, o
    // aviso espera numa fila local e sai quando o Cadastro voltar.
    static List<String> porConsulta() {
        int chamadas = 0,
            erros = 0,
            naHora = 0,
            maiorAtraso = 0;
        List<Integer> adiados = new ArrayList<>();
        for (int aviso = 1; aviso <= avisos; aviso++) {
            int minuto = aviso;
            if (cadastroNoAr(minuto)) {
                for (int antigo : adiados) {
                    chamadas++;
                    maiorAtraso = Math.max(maiorAtraso, minuto - antigo);
                }
                adiados.clear();
            }
            chamadas++;
            if (!cadastroNoAr(minuto)) {
                erros++;
                adiados.add(minuto);
                continue;
            }
            naHora++;
        }
        return List.of(
            "Consulta ao Cadastro por API, a cada aviso",
            "  chamadas ao Cadastro: " + chamadas + " (" + erros + " com erro)",
            "  avisos enviados na hora: " + naHora,
            "  avisos adiados até o Cadastro voltar: " +
                erros +
                " (o maior atraso: " +
                maiorAtraso +
                " min)",
            // Cada consulta lê o e-mail atual: nenhum aviso sai para um endereço antigo
            "  avisos para e-mail desatualizado: 0"
        );
    }

    // Caminho 2: a Comunicação guarda uma cópia dos contatos, carregada uma vez e
    // atualizada pelos eventos, que chegam alguns minutos depois da mudança
    static List<String> porReplica() {
        List<String> desatualizados = new ArrayList<>();
        for (int aviso = 1; aviso <= avisos; aviso++) {
            String unidade = unidadeDo(aviso);
            if (emailEm(unidade, aviso, atraso).equals(emailEm(unidade, aviso, 0))) {
                continue;
            }
            Mudanca ultima = null;
            for (Mudanca x : mudancas) {
                if (x.unidade().equals(unidade) && x.minuto() <= aviso) ultima = x;
            }
            desatualizados.add(
                String.format(
                    "    E-P-%03d para %s: e-mail antigo (mudou no minuto %d; a réplica, no %d)",
                    aviso,
                    unidade,
                    ultima.minuto(),
                    ultima.minuto() + atraso
                )
            );
        }
        long aplicados = mudancas
            .stream()
            .filter(m -> m.minuto() + atraso <= avisos)
            .count();
        List<String> linhas = new ArrayList<>(
            List.of(
                "Réplica dos contatos, alimentada por eventos (atraso de " +
                    atraso +
                    " min)",
                "  carga inicial: " + unidades + " contatos",
                "  eventos ContatoAlterado aplicados: " + aplicados,
                "  chamadas ao Cadastro: 0",
                "  avisos enviados na hora: " + avisos,
                "  avisos adiados até o Cadastro voltar: 0",
                "  avisos para e-mail desatualizado: " + desatualizados.size()
            )
        );
        linhas.addAll(desatualizados);
        return linhas;
    }

    public static void main(String[] args) throws Exception {
        JsonNode c = new ObjectMapper().readTree(
            Path.of("/dados/entrada/contatos.json").toFile()
        );
        unidades = c.get("unidades").asInt();
        avisos = c.get("avisos").asInt();
        de = c.get("cadastroFora").get("de").asInt();
        ate = c.get("cadastroFora").get("ate").asInt();
        atraso = c.get("atrasoDaReplica").asInt();
        for (JsonNode m : c.get("mudancas")) {
            mudancas.add(
                new Mudanca(
                    m.get("minuto").asInt(),
                    m.get("unidade").asText(),
                    m.get("email").asText()
                )
            );
        }
        List<String> linhas = new ArrayList<>(porConsulta());
        linhas.add("");
        linhas.addAll(porReplica());
        Path pasta = Path.of(args[0]).resolve("contatos");
        Files.createDirectories(pasta);
        Files.writeString(
            pasta.resolve("resultado.txt"),
            String.join("\n", linhas) + "\n"
        );
        System.out.println("contatos: saída em " + pasta);
    }
}
