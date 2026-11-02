// A abstração pertence ao Morada, não aos provedores: é a emissão que diz do que
// precisa. Cada provedor ganha um adaptador que implementa esta interface.
package morada.depois.emissao;

import morada.depois.cobranca.Cobranca;

public interface GatewayDePagamento {
    record Prazos(String vencimento, String descontoAte) {}

    record Registro(String unidade, String identificador) {}

    String nome();

    Registro registrar(Cobranca cobranca, Prazos prazos);
}
