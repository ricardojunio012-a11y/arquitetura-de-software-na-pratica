// O app do porteiro, no tablet. Sem internet, guarda as operações numa fila local e
// segue trabalhando; ao reconectar, envia a fila ao BFF e mostra os conflitos.
package morada;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import morada.BffPorteiro.Operacao;

public class Tablet {

    private final String nome;
    private final Supplier<BffPorteiro> conectar;
    private final List<String> registro;
    private final Map<String, Integer> versoes = new HashMap<>();
    private final List<Operacao> fila = new ArrayList<>();
    private boolean online = true;
    private int contador = 0;

    public Tablet(String nome, Supplier<BffPorteiro> conectar, List<String> registro) {
        this.nome = nome;
        this.conectar = conectar;
        this.registro = registro;
    }

    // O tablet fala com o endereço do BFF, seja qual for o processo que o atende
    private BffPorteiro bff() {
        return conectar.get();
    }

    private void log(String texto) {
        registro.add("tablet " + nome + " " + texto);
    }

    public void abrir() {
        var tela = bff().inicio();
        tela.encomendasPendentes().forEach(e -> versoes.put(e.encomenda(), e.versao()));
        String pendentes = tela
            .encomendasPendentes()
            .stream()
            .map(e -> e.encomenda())
            .collect(Collectors.joining(", "));
        String esperados = tela
            .visitantesEsperados()
            .stream()
            .map(v -> v.nome())
            .collect(Collectors.joining(", "));
        log(
            "abriu: encomendas [" +
                pendentes +
                "], visitantes esperados [" +
                esperados +
                "]"
        );
    }

    public void desconectar() {
        online = false;
        log("perdeu a internet");
    }

    public void operar(
        String tipo,
        String hora,
        String encomenda,
        String nome,
        String reserva
    ) {
        contador++;
        var op = new Operacao(
            "op-" + this.nome + contador,
            tipo,
            hora,
            encomenda,
            encomenda == null ? null : versoes.get(encomenda),
            nome,
            reserva
        );
        if (!online) {
            fila.add(op);
            log("guardou " + descrever(op) + " na fila local");
            return;
        }
        String resultado = bff().sincronizar(this.nome, List.of(op)).get(0).resultado();
        log("enviou " + descrever(op) + ": " + resultado);
    }

    // Ao reconectar, a fila vai em lote, e a resposta pode se perder no caminho
    public void reconectar(boolean perderResposta) {
        online = true;
        var resultados = bff().sincronizar(nome, fila);
        if (perderResposta) {
            log("voltou e enviou " + fila.size() + " operações; a resposta se perdeu");
            return;
        }
        mostrar("enviou", resultados);
    }

    // Sem resposta, o tablet não sabe o que foi aplicado: reenvia o mesmo lote
    public void reenviar() {
        mostrar("reenviou", bff().sincronizar(nome, fila));
    }

    private void mostrar(String verbo, List<BffPorteiro.Resultado> resultados) {
        log(verbo + " " + fila.size() + " operações:");
        for (var r : resultados) {
            registro.add("  " + descrever(r.operacao()) + ": " + r.resultado());
        }
        fila.clear();
    }

    private static String descrever(Operacao op) {
        String alvo = op.encomenda() != null ? op.encomenda() : op.nome();
        return op.id() + " (" + op.tipo() + " " + alvo + ")";
    }
}
