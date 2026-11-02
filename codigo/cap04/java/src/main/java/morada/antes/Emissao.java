// Tudo num método: as regras num if atrás do outro e o Banco Alfa chamado no meio do
// cálculo. Uma regra nova ou outro banco exigem mudar este método.
package morada.antes;

import static morada.compartilhado.Datas.*;
import static morada.compartilhado.Dinheiro.*;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import morada.externos.ClienteBancoAlfa;

public class Emissao {

    record Item(String texto, long valor) {}

    static String linha(String texto, long valor) {
        return String.format("  %-40s%10s", texto, reais(valor));
    }

    public static String[] emitirCobrancas(JsonNode dados, LocalDate hoje) {
        JsonNode p = dados.get("politica");
        String vencimento = dataDoMes(hoje, p.get("vencimentoDia").asInt());
        String descontoAte = dataDoMes(hoje, p.get("descontoAteDia").asInt());
        String titulo =
            rotuloDoMes(hoje) + " - " + dados.get("condominio").get("nome").asText();
        var banco = new ClienteBancoAlfa();
        List<String> cobrancas = new ArrayList<>(List.of("# Cobranças " + titulo));
        List<String> registros = new ArrayList<>();
        registros.add("# Registros " + titulo + " - Banco Alfa");
        registros.add("unidade;identificador;valor;desconto");

        for (JsonNode u : dados.get("unidades")) {
            List<Item> itens = new ArrayList<>();
            long despesas = dados
                .get("condominio")
                .get("despesasDoMesCentavos")
                .asLong();
            long taxa = parteDe(despesas, u.get("fracaoMilionesimos").asLong());
            itens.add(new Item("Taxa condominial", taxa));
            int pf = p.get("fundoDeReservaPorcento").asInt();
            itens.add(new Item("Fundo de reserva (" + pf + "%)", percentual(taxa, pf)));
            boolean sindico = u.path("sindico").asBoolean(false);
            if (sindico) itens.add(new Item("Isenção do síndico", -taxa));
            JsonNode d = u.get("debitoAnterior");
            if (!d.isNull()) {
                long v = d.get("valorCentavos").asLong();
                String venc = d.get("vencimento").asText();
                long dias = diasEntre(venc, hoje);
                long juros =
                    (v * p.get("jurosAoMesPorcento").asInt() * dias + 1500) / 3000;
                int pm = p.get("multaPorcento").asInt();
                itens.add(new Item("Débito anterior (venc. " + diaMes(venc) + ")", v));
                itens.add(new Item("Multa (" + pm + "%)", percentual(v, pm)));
                itens.add(new Item("Juros (" + dias + " dias)", juros));
            }
            long total = itens.stream().mapToLong(Item::valor).sum();
            int pd = p.get("descontoAntecipadoPorcento").asInt();
            // Sem desconto para o síndico e para quem tem débito (regra do capítulo 1)
            long desconto = sindico || !d.isNull() ? 0 : percentual(taxa, pd);

            cobrancas.add("");
            cobrancas.add(
                u.get("id").asText() + " " + u.get("morador").get("nome").asText()
            );
            for (Item i : itens) cobrancas.add(linha(i.texto(), i.valor()));
            String ate = diaMes(descontoAte);
            if (desconto > 0) {
                cobrancas.add(
                    linha("Desconto até " + ate + " (" + pd + "%)", -desconto)
                );
            }
            cobrancas.add(linha("Total", total));
            if (desconto > 0) {
                long comDesconto = total - desconto;
                cobrancas.add(linha("Total com desconto até " + ate, comDesconto));
            }

            // O cálculo conhece o banco: trocar de banco é mudar este método
            var boleto = banco.emitirBoleto(
                new ClienteBancoAlfa.PedidoDeBoleto(
                    u.get("morador").get("nome").asText(),
                    reaisComPonto(total),
                    dataBr(vencimento),
                    desconto > 0
                        ? new ClienteBancoAlfa.Desconto(
                              reaisComPonto(desconto),
                              dataBr(descontoAte)
                          )
                        : null
                )
            );
            registros.add(
                u.get("id").asText() +
                    ";boleto " +
                    boleto.nossoNumero() +
                    ";" +
                    reais(total) +
                    ";" +
                    reais(desconto)
            );
        }
        return new String[] {
            String.join("\n", cobrancas) + "\n",
            String.join("\n", registros) + "\n",
        };
    }
}
