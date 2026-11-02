// Uso: java morada.depois.Main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Raiz de composição: o único lugar que conhece as classes concretas e as monta.
package morada.depois;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import morada.compartilhado.Datas;
import morada.depois.cobranca.CalculadoraDeCobranca;
import morada.depois.cobranca.Regra;
import morada.depois.cobranca.Unidade;
import morada.depois.cobranca.regras.*;
import morada.depois.emissao.GatewayDePagamento;
import morada.depois.emissao.GatewayDePagamento.Prazos;
import morada.depois.emissao.ServicoDeEmissao;
import morada.depois.provedores.GatewayBancoAlfa;
import morada.depois.provedores.GatewayPagaFacil;
import morada.externos.ClienteBancoAlfa;
import morada.externos.PagaFacilApi;

public class Main {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Condominio(String nome, long despesasDoMesCentavos) {}

    record Politica(
        int fundoDeReservaPorcento,
        int multaPorcento,
        int jurosAoMesPorcento,
        int descontoAntecipadoPorcento,
        int descontoAteDia,
        int vencimentoDia
    ) {}

    record Dados(Condominio condominio, List<Unidade> unidades, Politica politica) {}

    public static void main(String[] args) throws Exception {
        LocalDate hoje =
            args.length > 3 && args[2].equals("--hoje")
                ? LocalDate.parse(args[3])
                : LocalDate.now();
        Dados dados = new ObjectMapper().readValue(
            Path.of(args[0]).toFile(),
            Dados.class
        );
        Politica p = dados.politica();
        var prazos = new Prazos(
            Datas.dataDoMes(hoje, p.vencimentoDia()),
            Datas.dataDoMes(hoje, p.descontoAteDia())
        );

        // A ordem importa: cada regra vê o que as anteriores lançaram
        List<Regra> regras = List.of(
            new TaxaCondominial(dados.condominio().despesasDoMesCentavos()),
            new FundoDeReserva(p.fundoDeReservaPorcento()),
            new IsencaoDoSindico(),
            new DebitoAnterior(),
            new MultaPorAtraso(p.multaPorcento()),
            new JurosPorAtraso(p.jurosAoMesPorcento(), hoje),
            // Por último: o desconto depende da isenção e do débito já lançados
            new DescontoAntecipado(p.descontoAntecipadoPorcento(), prazos.descontoAte())
        );
        Map<String, Supplier<GatewayDePagamento>> gateways = Map.of(
            "alfa",
            () -> new GatewayBancoAlfa(new ClienteBancoAlfa()),
            "pagafacil",
            () -> new GatewayPagaFacil(new PagaFacilApi())
        );
        String escolhido = System.getenv().getOrDefault("GATEWAY", "alfa");
        GatewayDePagamento gateway = gateways.get(escolhido).get();
        var servico = new ServicoDeEmissao(
            new CalculadoraDeCobranca(regras),
            gateway,
            prazos
        );

        var resultado = servico.emitir(dados.unidades());
        String titulo = Datas.rotuloDoMes(hoje) + " - " + dados.condominio().nome();
        Path saida = Path.of(args[1]);
        Files.createDirectories(saida);
        Files.writeString(
            saida.resolve("cobrancas.txt"),
            Relatorios.cobrancas(titulo, resultado.cobrancas(), prazos)
        );
        Files.writeString(
            saida.resolve("registros.txt"),
            Relatorios.registros(
                titulo,
                gateway.nome(),
                resultado.cobrancas(),
                resultado.registros()
            )
        );
        System.out.println(
            "cobranças emitidas em " + saida + " (" + gateway.nome() + ")"
        );
    }
}
