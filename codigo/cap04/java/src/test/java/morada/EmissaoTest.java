// Testes: o que a versão antes não deixa testar e o que a versão depois isola.
// Os dados ficam no teste, porque os testes também rodam na construção da imagem.
package morada;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.antes.Emissao;
import morada.depois.cobranca.CalculadoraDeCobranca;
import morada.depois.cobranca.Cobranca;
import morada.depois.cobranca.Lancamento;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;
import morada.depois.cobranca.regras.DebitoAnterior;
import morada.depois.cobranca.regras.DescontoAntecipado;
import morada.depois.cobranca.regras.FundoDeReserva;
import morada.depois.cobranca.regras.IsencaoDoSindico;
import morada.depois.cobranca.regras.TaxaCondominial;
import morada.depois.emissao.GatewayDePagamento;
import morada.depois.emissao.ServicoDeEmissao;
import morada.externos.ClienteBancoAlfa;
import org.junit.jupiter.api.Test;

class EmissaoTest {

    static final String DADOS = """
    {
      "condominio": { "nome": "Residencial Jardins", "despesasDoMesCentavos": 485000 },
      "unidades": [
        { "id": "A-101", "fracaoMilionesimos": 125000,
          "morador": { "nome": "Ana Souza" }, "debitoAnterior": null },
        { "id": "A-201", "fracaoMilionesimos": 125000,
          "morador": { "nome": "Carla Mendes" },
          "debitoAnterior": { "valorCentavos": 66750, "vencimento": "2026-02-10" } },
        { "id": "B-201", "fracaoMilionesimos": 140000, "sindico": true,
          "morador": { "nome": "Gabriela Torres" }, "debitoAnterior": null }
      ],
      "politica": { "fundoDeReservaPorcento": 10, "multaPorcento": 2,
        "jurosAoMesPorcento": 1, "descontoAntecipadoPorcento": 5,
        "descontoAteDia": 5, "vencimentoDia": 10 }
    }
    """;
    static final long DESPESAS = 485000;
    static final ObjectMapper JSON = new ObjectMapper();

    // Dublê de teste: implementa a interface e só anota o que recebeu
    static class GatewayEmMemoria implements GatewayDePagamento {

        final List<Cobranca> recebidas = new ArrayList<>();

        public String nome() {
            return "em memória";
        }

        public Registro registrar(Cobranca cobranca, Prazos prazos) {
            recebidas.add(cobranca);
            return new Registro(cobranca.unidade(), "teste");
        }
    }

    static List<Unidade> unidades() throws Exception {
        var tipo = JSON.getTypeFactory().constructCollectionType(
            List.class,
            Unidade.class
        );
        return JSON.readValue(JSON.readTree(DADOS).get("unidades").traverse(), tipo);
    }

    @Test
    void antesCalcularAsCobrancasTambemEmiteBoletosNoBanco() throws Exception {
        int antes = ClienteBancoAlfa.emitidos;
        Emissao.emitirCobrancas(JSON.readTree(DADOS), LocalDate.of(2026, 3, 2));
        assertEquals(3, ClienteBancoAlfa.emitidos - antes);
    }

    @Test
    void depoisUmaRegraNovaEntraSemMudarACalculadora() throws Exception {
        Regra taxaExtra = (unidade, lancados) ->
            List.of(new Lancamento("obra", "Chamada para obra", 5000));
        var calculadora = new CalculadoraDeCobranca(
            List.of(new TaxaCondominial(DESPESAS), taxaExtra)
        );
        assertEquals(60625 + 5000, calculadora.calcular(unidades().get(0)).total());
    }

    @Test
    void depoisSindicoFicaIsentoDaTaxaEPagaOFundo() throws Exception {
        var calculadora = new CalculadoraDeCobranca(
            List.of(
                new TaxaCondominial(DESPESAS),
                new FundoDeReserva(10),
                new IsencaoDoSindico()
            )
        );
        assertEquals(6790, calculadora.calcular(unidades().get(2)).total());
    }

    @Test
    void depoisQuemTemDebitoNaoGanhaODescontoPorPontualidade() throws Exception {
        var calculadora = new CalculadoraDeCobranca(
            List.of(
                new TaxaCondominial(DESPESAS),
                new DebitoAnterior(),
                new DescontoAntecipado(5, "2026-03-05")
            )
        );
        assertEquals(3031, calculadora.calcular(unidades().get(0)).desconto());
        assertEquals(0, calculadora.calcular(unidades().get(1)).desconto());
    }

    @Test
    void depoisEmissaoFuncionaComQualquerGatewaySemBancoDeVerdade() throws Exception {
        var gateway = new GatewayEmMemoria();
        var calculadora = new CalculadoraDeCobranca(
            List.of(new TaxaCondominial(DESPESAS))
        );
        var prazos = new GatewayDePagamento.Prazos("2026-03-10", "2026-03-05");
        int antes = ClienteBancoAlfa.emitidos;
        new ServicoDeEmissao(calculadora, gateway, prazos).emitir(unidades());
        assertEquals(3, gateway.recebidas.size());
        assertEquals(antes, ClienteBancoAlfa.emitidos);
    }
}
