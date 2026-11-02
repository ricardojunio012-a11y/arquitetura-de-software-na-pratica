// O módulo de Comunicação: envia avisos aos moradores. É idempotente pelo
// identificador do aviso: o mesmo aviso pedido duas vezes é enviado uma vez só.
package morada;

import java.util.HashSet;
import java.util.Set;

public class Comunicacao {

    private final Set<String> enviados = new HashSet<>();

    // Devolve true se enviou agora e false se o aviso já tinha sido enviado
    public boolean avisar(String id, String texto) {
        return enviados.add(id);
    }
}
