// As migrações rodam uma vez cada, em ordem, e uma segunda execução não faz nada.
// Na construção da imagem não há banco, e por isso o teste é pulado.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class MigracoesTest {

    @Test
    void aplicamCadaArquivoUmaUnicaVezEmOrdem() throws Exception {
        String url = System.getenv("BANCO_URL");
        assumeTrue(url != null, "sem banco");
        try (var banco = Banco.conectar(url)) {
            Banco.recriarEsquema(banco);
            Path pasta = Path.of("/dados/migracoes");
            assertEquals(
                List.of(
                    "001_cobrancas.sql",
                    "002_fundo_de_reserva.sql",
                    "003_indice_inadimplencia.sql"
                ),
                Migracoes.aplicar(banco, pasta)
            );
            assertEquals(List.of(), Migracoes.aplicar(banco, pasta));
        }
    }
}
