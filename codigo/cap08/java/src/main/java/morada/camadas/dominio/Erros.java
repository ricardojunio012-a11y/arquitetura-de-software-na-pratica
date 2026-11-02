// Camada de domínio: os erros falam a língua do negócio, não a do HTTP.
package morada.camadas.dominio;

public final class Erros {

    private Erros() {}

    public static class RegraVioladaErro extends RuntimeException {

        public RegraVioladaErro(String mensagem) {
            super(mensagem);
        }
    }

    public static class NaoEncontradoErro extends RuntimeException {

        public NaoEncontradoErro(String mensagem) {
            super(mensagem);
        }
    }

    public static String reais(long centavos) {
        String inteiro = String.format("%,d", centavos / 100).replace(',', '.');
        return "R$ " + inteiro + "," + String.format("%02d", centavos % 100);
    }
}
