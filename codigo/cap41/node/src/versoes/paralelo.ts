// Passo 4: execução paralela. O legado continua respondendo ao aplicativo; o Morada
// recebe os mesmos pedidos do Acácias pela camada de compatibilidade, e o proxy
// compara as respostas. Depois de corrigir o que apareceu, uma segunda rodada.
import { REGRAS_V1, type Regras } from "../acl/beta.ts";
import { montar, usarAplicativo, type Ambiente } from "../ambiente.ts";
import { Saida } from "../comum.ts";
import { ACACIAS } from "../legado/banco.ts";
import { migrar } from "../migracao.ts";
import { calcularCobrancas } from "../morada/banco.ts";
import type { ProxyBeta } from "../proxy.ts";

const ACACIAS_PREDIOS = ["P0101", "P0102", "P0103"];

// A segunda versão das regras: a isenção do síndico, achada na primeira rodada, e o
// vínculo das duas vagas, informado pelo síndico do Acácias
export const REGRAS_V2: Regras = {
  isencaoPelaObs: true,
  vinculos: { "P0101/G-09": "P0103/0402", "P0101/G-10": "P0102/0101" },
};

export async function prepararMorada(amb: Ambiente, regras: Regras): Promise<void> {
  await migrar(amb.legado, amb.morada, ACACIAS, "2026-10", regras);
  await calcularCobrancas(amb.morada, "c12345678", "2026-11");
}

const itens = (n: number) => (n === 1 ? "1 item" : `${n} itens`);

function relatorio(saida: Saida, p: ProxyBeta): void {
  saida.escrever(`  pedidos comparados: ${p.comparacoes}; iguais: ${p.iguais}`);
  const porTipo = new Map<string, Set<string>>();
  const ocorrencias = new Map<string, number>();
  for (const d of p.divergencias) {
    const tipo = `${d.tipo} (${d.rota})`;
    porTipo.set(tipo, (porTipo.get(tipo) ?? new Set()).add(d.chave));
    ocorrencias.set(tipo, (ocorrencias.get(tipo) ?? 0) + 1);
  }
  for (const [tipo, chaves] of [...porTipo].sort()) {
    const lista = [...chaves].sort();
    const amostra = lista.slice(0, 3).join(", ") + (lista.length > 3 ? ", ..." : "");
    saida.escrever(`  ${tipo}: ${itens(lista.length)}, ${ocorrencias.get(tipo)} vezes`);
    saida.escrever(`    ${amostra}`);
  }
  const graves = p.divergencias.filter((d) => !d.tipo.includes("(aceita)"));
  const n = new Set(graves.map((d) => d.chave)).size;
  saida.escrever(`  não explicadas: ${itens(n)}, ${graves.length} vezes`);
}

export async function paralelo(saida: Saida): Promise<void> {
  const amb = await montar();
  await prepararMorada(amb, REGRAS_V1);
  for (const rota of ["GET aptos", "GET rateios", "GET inadimplentes", "POST baixa"])
    amb.proxy.regras.push({ rota, predios: ACACIAS_PREDIOS, destino: "sombra" });

  saida.escrever("rodada 1: 10 dias, Acácias em sombra, regras da camada v1");
  await usarAplicativo(amb.url, ACACIAS_PREDIOS, 10, 11);
  relatorio(saida, amb.proxy);

  saida.escrever();
  saida.escrever(
    "correções: isenção do síndico pela observação; vínculo de G-09 e G-10",
  );
  await prepararMorada(amb, REGRAS_V2);
  amb.proxy.comparacoes = amb.proxy.iguais = 0;
  amb.proxy.divergencias = [];

  saida.escrever();
  saida.escrever("rodada 2: mais 10 dias, regras da camada v2");
  await usarAplicativo(amb.url, ACACIAS_PREDIOS, 10, 12);
  relatorio(saida, amb.proxy);
  await amb.fechar();
}
