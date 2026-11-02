// O Backend for Frontend do app do porteiro. Pertence ao time do app e fala a língua
// da tela: junta numa chamada o que o tablet precisa e recebe as operações feitas
// sem internet, em lote, aplicando cada uma uma vez só.
package morada;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import morada.Backend.Convidado;
import morada.Backend.Portaria;
import morada.Backend.Reservas;

public class BffPorteiro {

    public record Operacao(
        String id,
        String tipo,
        String hora,
        String encomenda,
        Integer versaoVista,
        String nome,
        String reserva
    ) {}

    public record EncomendaPendente(String encomenda, String unidade, int versao) {}

    public record TelaInicial(
        List<EncomendaPendente> encomendasPendentes,
        List<Convidado> visitantesEsperados
    ) {}

    public record Resultado(Operacao operacao, String resultado) {}

    private final Portaria portaria;
    private final Reservas reservas;
    private final Map<String, String> resultados;
    public int repetidas = 0;

    // Sem o terceiro argumento, os resultados ficam só na memória deste processo
    public BffPorteiro(Portaria portaria, Reservas reservas) {
        this(portaria, reservas, new HashMap<>());
    }

    public BffPorteiro(
        Portaria portaria,
        Reservas reservas,
        Map<String, String> resultados
    ) {
        this.portaria = portaria;
        this.reservas = reservas;
        this.resultados = resultados;
    }

    // A tela inicial inteira numa chamada, só com os campos que o tablet mostra
    public TelaInicial inicio() {
        var pendentes = portaria.encomendas
            .values()
            .stream()
            .filter(e -> e.situacao.equals("na portaria"))
            .map(e -> new EncomendaPendente(e.encomenda, e.unidade, e.versao))
            .toList();
        // Compara nome e reserva campo a campo: "Ana" não pode casar com "Maria Ana"
        var esperados = reservas
            .convidados()
            .stream()
            .filter(c ->
                portaria.visitantes
                    .stream()
                    .noneMatch(
                        v ->
                            v.nome().equals(c.nome()) && v.reserva().equals(c.reserva())
                    )
            )
            .toList();
        return new TelaInicial(pendentes, esperados);
    }

    // Idempotente pelo id da operação: um lote reenviado não aplica nada duas vezes
    public List<Resultado> sincronizar(String tablet, List<Operacao> operacoes) {
        List<Resultado> saida = new ArrayList<>();
        for (Operacao op : operacoes) {
            String anterior = resultados.get(op.id());
            if (anterior != null) {
                repetidas++;
                saida.add(new Resultado(op, anterior));
                continue;
            }
            String resultado = op.tipo().equals("registrarVisitante")
                ? portaria.registrarVisitante(
                      op.nome(),
                      op.reserva(),
                      tablet,
                      op.hora()
                  )
                : portaria.mudar(
                      op.encomenda(),
                      op.tipo().equals("entregar") ? "entregue" : "devolvida",
                      op.versaoVista(),
                      tablet,
                      op.hora()
                  );
            resultados.put(op.id(), resultado);
            saida.add(new Resultado(op, resultado));
        }
        return saida;
    }
}
