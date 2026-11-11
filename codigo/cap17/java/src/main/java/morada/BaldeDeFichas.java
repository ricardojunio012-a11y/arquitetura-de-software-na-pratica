// Balde de fichas: começa cheio, com "rajada" fichas, e ganha "porSegundo" fichas por
// segundo, sem passar do máximo. Cada pedido gasta uma ficha; sem ficha, o pedido é
// recusado. As fichas são contadas em milésimos para a conta ficar exata com o tempo
// em milissegundos.
package morada;

public class BaldeDeFichas {

    private final long rajada;
    private final long porSegundo;
    private long milesimos;
    private long ultimo = 0;

    public BaldeDeFichas(long rajada, long porSegundo) {
        this.rajada = rajada;
        this.porSegundo = porSegundo;
        this.milesimos = rajada * 1000;
    }

    public boolean permite(long agoraMs) {
        long ganho = (agoraMs - ultimo) * porSegundo;
        milesimos = Math.min(rajada * 1000, milesimos + ganho);
        ultimo = agoraMs;
        if (milesimos < 1000) return false;
        milesimos -= 1000;
        return true;
    }
}
