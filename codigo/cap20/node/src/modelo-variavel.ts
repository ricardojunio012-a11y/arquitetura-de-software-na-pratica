// Um modelo que imita a variação de um modelo de linguagem de verdade. Ele usa o
// modelo extrativo e, por sorteio com semente fixa, às vezes muda a forma da resposta
// (o mesmo conteúdo, escrito de outro jeito) e às vezes desliza: em vez de admitir que
// não sabe, responde com o trecho mais parecido. A semente torna a saída repetível.
import type { Trecho } from "./base.ts";
import { ModeloExtrativo, NAO_SEI, type Modelo, type Resposta } from "./modelo.ts";
import { tokens } from "./texto.ts";

// Gerador pseudoaleatório pequeno (mulberry32): a mesma semente, a mesma sequência
export function sorteador(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// O mesmo conteúdo em outra forma, como um modelo de verdade escreveria
export const reformular = (texto: string) =>
  texto
    .replace(/(\d+)h\b/g, "$1 horas")
    .replace(/R\$ (\d+),00/g, "$1 reais")
    .replace(/\bquatro\b/g, "4")
    .replace(/\bseis\b/g, "6");

export class ModeloVariavel implements Modelo {
  readonly #base = new ModeloExtrativo();
  readonly #sortear: () => number;

  constructor(semente: number) {
    this.#sortear = sorteador(semente);
  }

  responder(instrucoes: string, pergunta: string, trechos: Trecho[]): Resposta {
    const r = this.#base.responder(instrucoes, pergunta, trechos);
    const sorteio = this.#sortear();
    let texto = r.texto;
    if (texto === NAO_SEI && trechos.length > 0 && sorteio < 0.25) {
      // O deslize: responde a uma pergunta parecida, com toda a confiança
      const frase = trechos[0].texto.split(/(?<=\.)\s+/)[0];
      texto = `${frase} (${trechos[0].documento})`;
    } else if (texto !== NAO_SEI && sorteio < 0.4) {
      texto = reformular(texto);
    }
    return { ...r, texto, tokensSaida: tokens(texto) };
  }
}
