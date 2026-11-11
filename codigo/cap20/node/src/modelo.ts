// A porta do modelo de linguagem. O assistente não sabe que modelo responde: em
// produção, um adaptador chama um modelo local ou uma API; no laboratório, um modelo
// extrativo determinístico escolhe a frase dos trechos que mais responde à pergunta.
import type { Trecho } from "./base.ts";
import { palavras, tokens } from "./texto.ts";

export interface Resposta {
  texto: string;
  tokensEntrada: number;
  tokensSaida: number;
}

export interface Modelo {
  responder(instrucoes: string, pergunta: string, trechos: Trecho[]): Resposta;
}

export const NAO_SEI = "Não encontrei essa informação nos documentos do condomínio.";

export class ModeloExtrativo implements Modelo {
  responder(instrucoes: string, pergunta: string, trechos: Trecho[]): Resposta {
    const prompt = [instrucoes, ...trechos.map((t) => t.texto), pergunta].join("\n");
    const procuradas = new Set(palavras(pergunta));
    let melhor = { frase: "", documento: "", pontos: 0 };
    for (const t of trechos) {
      for (const frase of t.texto.split(/(?<=\.)\s+/)) {
        const pontos = new Set(palavras(frase).filter((p) => procuradas.has(p))).size;
        if (pontos > melhor.pontos) melhor = { frase, documento: t.documento, pontos };
      }
    }
    // Só responde com uma frase que contém todas as palavras da pergunta; sem ela,
    // admite que não sabe, em vez de responder a outra pergunta parecida
    const cobre = melhor.pontos > 0 && melhor.pontos === procuradas.size;
    const texto = cobre ? `${melhor.frase} (${melhor.documento})` : NAO_SEI;
    return { texto, tokensEntrada: tokens(prompt), tokensSaida: tokens(texto) };
  }
}
