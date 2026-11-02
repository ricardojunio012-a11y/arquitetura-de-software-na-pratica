// Controlador (GRASP): coordena o cálculo e o registro sem fazer nenhum dos dois.
// Depende de abstrações recebidas pelo construtor (injeção de dependência).
package morada.depois.emissao;

import java.util.List;
import morada.depois.cobranca.CalculadoraDeCobranca;
import morada.depois.cobranca.Cobranca;
import morada.depois.cobranca.Unidade;
import morada.depois.emissao.GatewayDePagamento.Prazos;
import morada.depois.emissao.GatewayDePagamento.Registro;

public class ServicoDeEmissao {

    public record Resultado(List<Cobranca> cobrancas, List<Registro> registros) {}

    private final CalculadoraDeCobranca calculadora;
    private final GatewayDePagamento gateway;
    private final Prazos prazos;

    public ServicoDeEmissao(
        CalculadoraDeCobranca calculadora,
        GatewayDePagamento gateway,
        Prazos prazos
    ) {
        this.calculadora = calculadora;
        this.gateway = gateway;
        this.prazos = prazos;
    }

    public Resultado emitir(List<Unidade> unidades) {
        List<Cobranca> cobrancas = unidades
            .stream()
            .map(calculadora::calcular)
            .toList();
        List<Registro> registros = cobrancas
            .stream()
            .map(c -> gateway.registrar(c, prazos))
            .toList();
        return new Resultado(cobrancas, registros);
    }
}
