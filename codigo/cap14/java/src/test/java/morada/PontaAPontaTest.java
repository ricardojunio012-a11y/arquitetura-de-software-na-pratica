// Teste de ponta a ponta: o cliente do monólito, a API real e o PostgreSQL juntos.
// Poucos, lentos e valiosos: provam que as peças foram ligadas corretamente.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import morada.comunicacao.Api;
import morada.comunicacao.AvisosNoPostgres;
import morada.comunicacao.Comunicacao;
import morada.monolito.ClienteComunicacao;
import morada.monolito.ClienteComunicacao.Resultado;
import org.junit.jupiter.api.Test;

class PontaAPontaTest {

    @Test
    void enviaOAvisoUmaVezEReconheceOReenvio() throws Exception {
        assumeTrue(System.getenv("BANCO_URL") != null, "sem banco");
        try (var avisos = AvisosNoPostgres.conectar(System.getenv("BANCO_URL"))) {
            var api = Api.criar(new Comunicacao(avisos));
            var cliente = new ClienteComunicacao(Api.subir(api));
            assertEquals(
                new Resultado(true, false, null),
                cliente.avisar("E-1", "pagamento recebido")
            );
            assertEquals(
                new Resultado(true, true, null),
                cliente.avisar("E-1", "pagamento recebido")
            );
            api.stop(0);
        }
    }
}
