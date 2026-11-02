// Uma regra de negócio foi violada; a mensagem é para o morador.
package morada.depois.dominio;

public class ErroDeDominio extends RuntimeException {

    public ErroDeDominio(String mensagem) {
        super(mensagem);
    }
}
