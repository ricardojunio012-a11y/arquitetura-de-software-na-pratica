// O serviço de Comunicação do capítulo 12, agora com um repositório de avisos: o
// mesmo aviso pedido duas vezes é enviado uma vez só.
package morada.comunicacao;

import java.util.HashMap;
import java.util.Map;

public class Comunicacao {

    public static class DadosInvalidosErro extends RuntimeException {

        public DadosInvalidosErro(String mensagem) {
            super(mensagem);
        }
    }

    public interface RepositorioDeAvisos {
        boolean jaEnviado(String id);

        void registrar(String id, String texto);
    }

    public static class AvisosEmMemoria implements RepositorioDeAvisos {

        private final Map<String, String> avisos = new HashMap<>();

        public boolean jaEnviado(String id) {
            return avisos.containsKey(id);
        }

        public void registrar(String id, String texto) {
            avisos.put(id, texto);
        }
    }

    private final RepositorioDeAvisos avisos;

    public Comunicacao(RepositorioDeAvisos avisos) {
        this.avisos = avisos;
    }

    public String avisar(String id, String texto) {
        if (texto == null || texto.isEmpty()) {
            throw new DadosInvalidosErro("texto obrigatório");
        }
        if (avisos.jaEnviado(id)) return "repetido";
        avisos.registrar(id, texto);
        return "enviado";
    }
}
