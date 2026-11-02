// Testes de unidade: a regra do serviço, sem rede e sem banco. Rodam em milissegundos.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import morada.comunicacao.Comunicacao;
import morada.comunicacao.Comunicacao.AvisosEmMemoria;
import morada.comunicacao.Comunicacao.DadosInvalidosErro;
import org.junit.jupiter.api.Test;

class UnidadeTest {

    @Test
    void enviaUmAvisoNovo() {
        var comunicacao = new Comunicacao(new AvisosEmMemoria());
        assertEquals("enviado", comunicacao.avisar("E-1", "pagamento recebido"));
    }

    @Test
    void reconheceUmAvisoRepetido() {
        var comunicacao = new Comunicacao(new AvisosEmMemoria());
        comunicacao.avisar("E-1", "pagamento recebido");
        assertEquals("repetido", comunicacao.avisar("E-1", "pagamento recebido"));
    }

    @Test
    void recusaUmAvisoSemTexto() {
        var comunicacao = new Comunicacao(new AvisosEmMemoria());
        assertThrows(DadosInvalidosErro.class, () -> comunicacao.avisar("E-1", ""));
    }
}
