// Passo 2: a camada anticorrupção traduz o Residencial Acácias do modelo da Beta
// para o do Morada, e separa o que não sabe traduzir.
import { lerLegado, REGRAS_V1, traduzir } from "../acl/beta.ts";
import { reais, Saida } from "../comum.ts";
import { ACACIAS, criarLegado } from "../legado/banco.ts";

export async function traducao(saida: Saida): Promise<void> {
  const legado = lerLegado(criarLegado(), ACACIAS, "2026-10");
  const t = traduzir(legado, REGRAS_V1);
  const tipo = (x: string) => legado.aptos.filter((a) => a.tipo === x).length;

  saida.escrever(`legado: ${legado.predios.length} prédios com o CNPJ ${ACACIAS}`);
  saida.escrever(`  ${legado.predios.map((p) => `${p.cod} ${p.nome}`).join("; ")}`);
  saida.escrever(`  ${tipo("A")} aptos do tipo A, ${tipo("G")} do tipo G (vagas)`);
  saida.escrever(`  ${legado.rateios.length} rateios de 08/2026 a 10/2026`);
  saida.escrever();
  saida.escrever(`Morada: 1 condomínio, ${t.condominio.id} ("${t.condominio.nome}")`);
  for (const b of ["A", "B", "C"]) {
    const n = t.unidades.filter((u) => u.bloco === b).length;
    saida.escrever(`  bloco ${b}: ${n} unidades`);
  }
  saida.escrever(`  ${t.vagas.length} vagas, cada uma ligada a uma unidade`);
  saida.escrever(`  ${t.cobrancas.length} cobranças`);
  saida.escrever(`  quarentena: ${t.quarentena.length}`);
  for (const q of t.quarentena) saida.escrever(`    ${q.chave_legado}: ${q.motivo}`);
  saida.escrever();

  saida.escrever("exemplos, antes e depois:");
  const apto = legado.aptos.find((a) => a.cod_predio === "P0102" && a.apto === "0201")!;
  const u = t.unidades.find((u) => u.id.endsWith("-B-0201"))!;
  saida.escrever(
    `  apto ${apto.cod_predio}/${apto.apto} tipo ${apto.tipo} fração ${apto.fracao}`,
  );
  saida.escrever(`    -> unidade ${u.id}, bloco ${u.bloco}, fração ${u.fracao}`);
  const g = legado.aptos.find((a) => a.apto === "G-03")!;
  const v = t.vagas.find((v) => v.id.endsWith("G-03"))!;
  saida.escrever(
    `  apto ${g.cod_predio}/${g.apto} tipo ${g.tipo} vínculo ${g.vinculo}`,
  );
  saida.escrever(`    -> vaga ${v.id} da unidade ${v.unidade_id}`);
  const r = legado.rateios.find((r) => r.apto === "0102" && r.comp === "10/2026")!;
  const c = t.cobrancas.find((c) => c.id === "c12345678-A-0102.2026-10")!;
  saida.escrever(
    `  rateio ${r.cod_predio}/${r.apto} ${r.comp} ${r.vencto} ` +
      `${r.valor} pago ${r.pago} ${r.dt_pagto}`,
  );
  saida.escrever(
    `    -> cobrança ${c.id}, ${c.vencimento}, ` +
      `${reais(c.valor_centavos)}, paga em ${c.pago_em}`,
  );
}
