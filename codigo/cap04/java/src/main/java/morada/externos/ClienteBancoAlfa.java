// Simula o SDK de um banco emissor de boletos. A API é do banco, não do Morada:
// valores em reais com ponto e datas no formato DD/MM/AAAA.
package morada.externos;

public class ClienteBancoAlfa {

    public record Desconto(String valor, String ate) {}

    public record PedidoDeBoleto(
        String pagador,
        String valor,
        String vencimento,
        Desconto desconto
    ) {}

    public record Boleto(String nossoNumero) {}

    // Boletos emitidos no "servidor" do banco (o teste da versão antes usa)
    public static int emitidos = 0;

    public Boleto emitirBoleto(PedidoDeBoleto pedido) {
        if (pedido.pagador() == null || pedido.valor() == null) {
            throw new IllegalArgumentException("pedido incompleto");
        }
        emitidos++;
        return new Boleto(String.format("%07d", emitidos));
    }
}
