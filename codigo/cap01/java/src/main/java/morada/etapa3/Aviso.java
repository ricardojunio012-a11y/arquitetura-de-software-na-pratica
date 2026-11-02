// Tudo o que um canal precisa para avisar o morador.
package morada.etapa3;

public record Aviso(
    String condominio,
    Competencia competencia,
    Cobranca cobranca,
    String nomeDoPagamento,
    String codigoDePagamento
) {}
