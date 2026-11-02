// Uso: node main.ts <comandos.json> <pasta-de-saída>
// Monta os módulos e executa os comandos do Financeiro e de Reservas em ordem.
import fs from "node:fs";
import path from "node:path";
import { Financeiro } from "./modulos/financeiro/api.ts";
import { TabelaDeCobrancas } from "./modulos/financeiro/interno/tabela.ts";
import { Reservas } from "./modulos/reservas/api.ts";
import { SituacaoPelaTabela } from "./modulos/reservas/interno/situacao.ts";

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const tabela = new TabelaDeCobrancas();
const financeiro = new Financeiro(tabela);
// O atalho: Reservas recebe a tabela do Financeiro, e não a API dele
const reservas = new Reservas(dados.espacos, new SituacaoPelaTabela(tabela));

interface Comando {
  modulo: string;
  tipo: string;
  cobranca: string;
  unidade: string;
  valorCentavos: number;
  vencimento: string;
  em: string;
  parcelas: number;
  reserva: string;
  espaco: string;
  data: string;
}

function executar(c: Comando): [string, string, string] {
  switch (c.tipo) {
    case "emitir":
      return [
        c.cobranca,
        "emitida",
        financeiro.emitir(c.cobranca, c.unidade, c.valorCentavos, c.vencimento),
      ];
    case "pagar":
      return [c.cobranca, "paga", financeiro.pagar(c.cobranca, c.em)];
    case "parcelar":
      return [c.cobranca, "parcelada", financeiro.parcelar(c.cobranca, c.parcelas)];
    default:
      try {
        return [
          c.reserva,
          "confirmada",
          reservas.reservar(c.reserva, c.unidade, c.espaco, c.data, c.em),
        ];
      } catch (erro) {
        return [c.reserva, "recusada", (erro as Error).message];
      }
  }
}

const linhas = dados.comandos.map((c: Comando) => {
  const [id, situacao, detalhe] = executar(c);
  return `${id};${c.tipo};${situacao};${detalhe}`;
});
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultados.txt"), linhas.join("\n") + "\n");
console.log(`${linhas.length} comandos executados; saída em ${saida}`);
