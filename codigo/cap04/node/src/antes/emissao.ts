// Tudo numa função: as regras em ifs encadeados e o Banco Alfa chamado no meio do
// cálculo. Uma regra nova ou outro banco exigem mudar esta função.
import {
  dataBr,
  dataDoMes,
  diaMes,
  diasEntre,
  rotuloDoMes,
} from "../compartilhado/datas.ts";
import {
  parteDe,
  percentual,
  reais,
  reaisComPonto,
} from "../compartilhado/dinheiro.ts";
import { ClienteBancoAlfa } from "../externos/banco-alfa.ts";

const linha = (texto: string, valor: number) =>
  "  " + texto.padEnd(40) + reais(valor).padStart(10);

export function emitirCobrancas(dados: any, hoje: Date) {
  const p = dados.politica;
  const vencimento = dataDoMes(hoje, p.vencimentoDia);
  const descontoAte = dataDoMes(hoje, p.descontoAteDia);
  const titulo = `${rotuloDoMes(hoje)} - ${dados.condominio.nome}`;
  const banco = new ClienteBancoAlfa();
  const cobrancas = [`# Cobranças ${titulo}`];
  const registros = [`# Registros ${titulo} - Banco Alfa`];
  registros.push("unidade;identificador;valor;desconto");

  for (const u of dados.unidades) {
    const itens: [string, number][] = [];
    const taxa = parteDe(dados.condominio.despesasDoMesCentavos, u.fracaoMilionesimos);
    itens.push(["Taxa condominial", taxa]);
    const fundo = percentual(taxa, p.fundoDeReservaPorcento);
    itens.push([`Fundo de reserva (${p.fundoDeReservaPorcento}%)`, fundo]);
    if (u.sindico) itens.push(["Isenção do síndico", -taxa]);
    const d = u.debitoAnterior;
    if (d) {
      const dias = diasEntre(d.vencimento, hoje);
      const juros = Math.floor(
        (d.valorCentavos * p.jurosAoMesPorcento * dias + 1500) / 3000,
      );
      itens.push([`Débito anterior (venc. ${diaMes(d.vencimento)})`, d.valorCentavos]);
      itens.push([
        `Multa (${p.multaPorcento}%)`,
        percentual(d.valorCentavos, p.multaPorcento),
      ]);
      itens.push([`Juros (${dias} dias)`, juros]);
    }
    const total = itens.reduce((soma, [, valor]) => soma + valor, 0);
    // Sem desconto para o síndico e para quem tem débito (regra do capítulo 1)
    const pd = p.descontoAntecipadoPorcento;
    const desconto = u.sindico || d ? 0 : percentual(taxa, pd);

    cobrancas.push(
      "",
      `${u.id} ${u.morador.nome}`,
      ...itens.map(([t, v]) => linha(t, v)),
    );
    const ate = diaMes(descontoAte);
    if (desconto > 0) {
      cobrancas.push(
        linha(`Desconto até ${ate} (${p.descontoAntecipadoPorcento}%)`, -desconto),
      );
    }
    cobrancas.push(linha("Total", total));
    if (desconto > 0)
      cobrancas.push(linha(`Total com desconto até ${ate}`, total - desconto));

    // O cálculo conhece o banco: trocar de banco é mudar esta função
    const boleto = banco.emitirBoleto({
      pagador: u.morador.nome,
      valor: reaisComPonto(total),
      vencimento: dataBr(vencimento),
      ...(desconto > 0 && {
        desconto: { valor: reaisComPonto(desconto), ate: dataBr(descontoAte) },
      }),
    });
    registros.push(
      `${u.id};boleto ${boleto.nossoNumero};${reais(total)};${reais(desconto)}`,
    );
  }
  return {
    cobrancas: cobrancas.join("\n") + "\n",
    registros: registros.join("\n") + "\n",
  };
}
