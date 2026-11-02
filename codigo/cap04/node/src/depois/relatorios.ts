// Relatórios: só leem cobranças e registros. Uma regra nova aparece aqui sozinha.
import { diaMes } from "../compartilhado/datas.ts";
import { reais } from "../compartilhado/dinheiro.ts";
import type { Cobranca } from "./cobranca/cobranca.ts";
import type { Prazos, Registro } from "./emissao/gateway.ts";

const linha = (texto: string, valor: number) =>
  "  " + texto.padEnd(40) + reais(valor).padStart(10);

export function relatorioDeCobrancas(
  titulo: string,
  cobrancas: readonly Cobranca[],
  prazos: Prazos,
): string {
  const linhas = [`# Cobranças ${titulo}`];
  for (const c of cobrancas) {
    linhas.push("", `${c.unidade} ${c.morador}`);
    for (const l of c.lancamentos) linhas.push(linha(l.descricao, l.valor));
    linhas.push(linha("Total", c.total));
    if (c.desconto > 0) {
      const texto = `Total com desconto até ${diaMes(prazos.descontoAte)}`;
      linhas.push(linha(texto, c.total - c.desconto));
    }
  }
  return linhas.join("\n") + "\n";
}

export function relatorioDeRegistros(
  titulo: string,
  gateway: string,
  cobrancas: readonly Cobranca[],
  registros: readonly Registro[],
): string {
  const linhas = [`# Registros ${titulo} - ${gateway}`];
  linhas.push("unidade;identificador;valor;desconto");
  registros.forEach((r, i) => {
    const c = cobrancas[i];
    linhas.push(
      `${r.unidade};${r.identificador};${reais(c.total)};${reais(c.desconto)}`,
    );
  });
  return linhas.join("\n") + "\n";
}
