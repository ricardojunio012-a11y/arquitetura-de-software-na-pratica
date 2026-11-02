// O arquivo de entrada: o condomínio e suas unidades.
package morada.etapa3;

import java.util.List;

public record DadosDoCondominio(Condominio condominio, List<Unidade> unidades) {
    public record Condominio(String id, String nome, long despesasDoMesCentavos) {}
}
