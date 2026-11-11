// Monta o laboratório: o legado, o Morada, a camada de compatibilidade e o proxy,
// cada um no seu servidor HTTP. E simula o uso do aplicativo da Beta, dia a dia.
import type { PGlite } from "@electric-sql/pglite";
import type { DatabaseSync } from "node:sqlite";
import { compatBeta } from "./acl/compat.ts";
import { avancarDia, gerador, relogio } from "./comum.ts";
import { chamar, servir, type Servidor } from "./http.ts";
import { calcularRateio, criarLegado, ACACIAS, IPES } from "./legado/banco.ts";
import { apiLegado } from "./legado/servidor.ts";
import { criarMorada } from "./morada/banco.ts";
import { apiMorada } from "./morada/servidor.ts";
import { ProxyBeta } from "./proxy.ts";

export type Ambiente = {
  legado: DatabaseSync;
  morada: PGlite;
  proxy: ProxyBeta;
  url: string; // o endereço que o aplicativo da Beta usa: o do proxy
  fechar: () => Promise<void>;
};

export async function montar(): Promise<Ambiente> {
  relogio.hoje = "2026-11-01";
  const legado = criarLegado();
  // O fechamento do mês: o legado calcula o rateio de novembro no dia 1
  calcularRateio(legado, ACACIAS, "11/2026");
  calcularRateio(legado, IPES, "11/2026");
  const morada = await criarMorada();
  const servidores: Servidor[] = [];
  const s1 = await servir(apiLegado(legado));
  const s2 = await servir(apiMorada(morada));
  const proxy = new ProxyBeta(s1.url, compatBeta(s2.url, morada));
  const s3 = await servir(proxy.tratar);
  servidores.push(s1, s2, s3);
  return {
    legado,
    morada,
    proxy,
    url: s3.url,
    fechar: async () => {
      for (const s of servidores) await s.fechar();
      await morada.close();
    },
  };
}

const hojeBr = () => relogio.hoje.split("-").reverse().join("/");

// O aplicativo da Beta em uso: consultas de aptos, rateios e inadimplentes, baixas
// de pagamento e comunicados. O sorteio tem semente fixa.
export async function usarAplicativo(
  url: string,
  predios: string[],
  dias: number,
  semente: number,
): Promise<void> {
  const sorteio = gerador(semente);
  for (let d = 0; d < dias; d++) {
    for (const p of predios) {
      if (sorteio() < 0.3) await chamar(url, "GET", `/predios/${p}/aptos`);
      if (sorteio() < 0.6)
        await chamar(url, "GET", `/predios/${p}/rateios?comp=11/2026`);
      if (sorteio() < 0.4)
        await chamar(url, "GET", `/predios/${p}/rateios?comp=10/2026`);
      if (sorteio() < 0.5) {
        const r = await chamar(url, "GET", `/predios/${p}/inadimplentes`);
        const lista = r.corpo as { apto: string; comps: string[] }[];
        if (lista.length > 0 && sorteio() < 0.6) {
          const alvo = lista[Math.floor(sorteio() * lista.length)];
          await chamar(url, "POST", `/predios/${p}/rateios/${alvo.apto}/baixa`, {
            comp: alvo.comps[0],
            dt_pagto: hojeBr(),
          });
        }
      }
      if (sorteio() < 0.15)
        await chamar(url, "POST", `/predios/${p}/comunicados`, { titulo: "Aviso" });
    }
    avancarDia();
  }
}
