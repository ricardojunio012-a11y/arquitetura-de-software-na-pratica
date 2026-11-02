// Simulação da fila de registro em lote no banco emissor (o "agora a parte difícil").
// Relógio simulado e sorteio com semente fixa: a mesma saída em qualquer máquina.
// Os números do arquivo registro.json são premissas do laboratório, não de um banco real.
package morada;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public final class FilaDeRegistro {

    public record Premissas(
        String id,
        String descricao,
        int boletos,
        int boletosPorArquivo,
        int registrosPorSegundo, // vazão do banco ao processar um arquivo de remessa
        long retornoSegundos, // o retorno de cada arquivo chega este tempo depois
        int falhaPassageiraPorCento, // recusa que pode dar certo numa nova tentativa
        int recusaDefinitivaACada, // 1 a cada N boletos tem dado inválido (ex.: CPF)
        int maxTentativas,
        long limiteSegundos,
        long semente
    ) {}

    public static final class Resultado {

        public int arquivos;
        public long tentativas;
        // segundo da simulação -> quantos boletos (ordenado pelo tempo)
        public final TreeMap<Long, Integer> disponivelEm = new TreeMap<>();
        public int semRegistro; // nunca ficaram disponíveis
        public int viaPix; // receberam o Pix no lugar do boleto

        void disponivel(long t) {
            disponivelEm.merge(t, 1, Integer::sum);
        }
    }

    private record Arquivo(
        long envio,
        int ordem,
        List<Integer> boletos,
        int tentativa
    ) {}

    private FilaDeRegistro() {}

    // ingênua: reenvia toda recusa e só avisa o morador com o boleto registrado.
    // ajustada: recusa definitiva não volta para a fila, e o boleto que não daria
    // tempo de confirmar vira Pix (a alternativa do ADR-002).
    public static Resultado simular(Premissas p, boolean ajustada) {
        // Gerador congruente de Park e Miller: só inteiros, igual nas quatro linguagens
        long[] x = { p.semente() };
        List<Arquivo> fila = new ArrayList<>();
        for (int i = 0; i < p.boletos(); i += p.boletosPorArquivo()) {
            int fim = Math.min(p.boletos(), i + p.boletosPorArquivo());
            List<Integer> boletos = new ArrayList<>();
            for (int b = i; b < fim; b++) boletos.add(b);
            fila.add(new Arquivo(0, fila.size(), boletos, 1));
        }
        Resultado r = new Resultado();
        int ordem = fila.size();
        long bancoLivre = 0;
        while (!fila.isEmpty()) {
            // O banco processa um arquivo por vez, na ordem de chegada
            int i = 0;
            for (int k = 1; k < fila.size(); k++) {
                Arquivo a = fila.get(k),
                    b = fila.get(i);
                if (
                    a.envio() < b.envio() ||
                    (a.envio() == b.envio() && a.ordem() < b.ordem())
                ) {
                    i = k;
                }
            }
            Arquivo arq = fila.remove(i);
            int n = arq.boletos().size();
            r.arquivos++;
            r.tentativas += n;
            long inicio = Math.max(arq.envio(), bancoLivre);
            bancoLivre =
                inicio + (n + p.registrosPorSegundo() - 1) / p.registrosPorSegundo();
            long retorno = bancoLivre + p.retornoSegundos();
            List<Integer> reenviar = new ArrayList<>();
            for (int b : arq.boletos()) {
                boolean definitiva = b % p.recusaDefinitivaACada() == 0;
                boolean recusado = definitiva;
                if (!definitiva) {
                    x[0] = (x[0] * 48271) % 2147483647;
                    recusado = x[0] % 100 < p.falhaPassageiraPorCento();
                }
                if (!recusado) {
                    r.disponivel(retorno);
                } else if (!ajustada) {
                    if (arq.tentativa() < p.maxTentativas()) reenviar.add(b);
                    else r.semRegistro++;
                } else if (
                    definitiva ||
                    arq.tentativa() >= p.maxTentativas() ||
                    retorno + p.retornoSegundos() > p.limiteSegundos()
                ) {
                    r.disponivel(retorno); // o aviso sai com o Pix, sem esperar outro ciclo
                    r.viaPix++;
                } else {
                    reenviar.add(b);
                }
            }
            if (!reenviar.isEmpty()) {
                fila.add(new Arquivo(retorno, ordem++, reenviar, arq.tentativa() + 1));
            }
        }
        return r;
    }

    // Percentil pela posição mais próxima, em milésimos (990 = p99, 999 = p99,9).
    // Devolve null quando ele cai nos boletos que nunca ficaram disponíveis.
    public static Long percentil(Resultado r, int total, int milesimos) {
        long posicao = ((long) milesimos * total + 999) / 1000;
        long acumulado = 0;
        for (Map.Entry<Long, Integer> e : r.disponivelEm.entrySet()) {
            acumulado += e.getValue();
            if (acumulado >= posicao) return e.getKey();
        }
        return null;
    }

    public static int disponiveisAte(Resultado r, long limite) {
        return r.disponivelEm
            .headMap(limite, true)
            .values()
            .stream()
            .mapToInt(Integer::intValue)
            .sum();
    }
}
