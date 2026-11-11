// Função de aptidão do ADR-038: o p95 do painel de inadimplência fica abaixo de
// 300 ms com 40 pedidos por segundo. Holística e dinâmica: roda o código do commit
// contra um PostgreSQL de verdade (PGlite, em memória), conta as consultas e as
// linhas de cada pedido e passa essa conta por uma carga simulada.
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Banco } from "../banco.ts";
import { duracao, gerador, percentil, simular } from "./carga.ts";

export const META = { p95Ms: 300, pedidosPorSegundo: 40, segundos: 30, conexoes: 4 };
const CONDOMINIOS = 20;

// 20 condomínios de 51 a 199 unidades, três meses de cobranças por unidade
export async function bancoDeTeste(): Promise<PGlite> {
  const pg = new PGlite();
  await pg.exec(`
    create schema cadastro; create schema financeiro;
    create table cadastro.unidades (
      id int primary key, condominio int not null, nome text not null);
    create table financeiro.cobrancas (
      unidade int not null, condominio int not null, vencimento date not null,
      valor numeric(10, 2) not null, pago boolean not null, em_acordo boolean not null);
    insert into cadastro.unidades
      select c * 1000 + u, c, 'U-' || u
        from generate_series(1, ${CONDOMINIOS}) c,
             generate_series(1, 40 + (c * 37) % 161) u;
    insert into financeiro.cobrancas
      select id, condominio, date '2026-07-05' + make_interval(months => m),
             650, not (id % 6 = 0 and m > 0), id % 12 = 0
        from cadastro.unidades, generate_series(0, 2) m;`);
  return pg;
}

// Um banco que conta as linhas de cada consulta
function contador(pg: PGlite, linhas: number[]): Banco {
  return {
    async consultar<T>(sql: string, params: unknown[] = []) {
      const r = await pg.query<T>(sql, params);
      linhas.push(r.rows.length);
      return r.rows;
    },
  };
}

type Painel = (banco: Banco, condominio: number) => Promise<unknown[]>;

export async function latenciaDoPainel(pg: PGlite, pastaDoCommit: string) {
  const modulo = path.join(pastaDoCommit, "financeiro", "painel.ts");
  const { painelInadimplencia } = (await import(modulo)) as {
    painelInadimplencia: Painel;
  };
  // O perfil de cada condomínio: quantas linhas cada consulta devolveu
  const perfis: number[][] = [];
  for (let c = 1; c <= CONDOMINIOS; c++) {
    const linhas: number[] = [];
    await painelInadimplencia(contador(pg, linhas), c);
    perfis.push(linhas);
  }
  const sorteio = gerador(38);
  const total = META.pedidosPorSegundo * META.segundos;
  const intervalo = 1000 / META.pedidosPorSegundo;
  const chegadas = Array.from({ length: total }, (_, i) => i * intervalo);
  const alvos = chegadas.map(() => Math.floor(sorteio() * CONDOMINIOS));
  const duracoes = alvos.map((c) => duracao(perfis[c], sorteio));
  const latencias = simular(chegadas, duracoes, META.conexoes);
  const consultas = alvos.reduce((s, c) => s + perfis[c].length, 0) / total;
  return {
    p50: percentil(latencias, 50),
    p95: percentil(latencias, 95),
    consultasPorPedido: consultas,
    maiorPerfil: Math.max(...perfis.map((p) => p.length)),
  };
}
