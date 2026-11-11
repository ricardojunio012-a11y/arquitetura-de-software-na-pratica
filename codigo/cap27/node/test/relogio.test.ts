// O relógio de Lamport preserva a causalidade, mesmo com relógios físicos desacertados.
import { describe, expect, it } from "vitest";
import { RelogioDeLamport } from "../src/relogio.ts";

describe("relógio de Lamport", () => {
  it("a resposta tem marca maior que a pergunta que a causou", () => {
    const portaria = new RelogioDeLamport();
    const servidor = new RelogioDeLamport();
    for (let i = 0; i < 5; i++) servidor.tique(); // o servidor já viu outros eventos
    const pergunta = portaria.tique(); // 1
    const recebida = servidor.receber(pergunta); // 7
    const resposta = servidor.tique(); // 8
    const chegada = portaria.receber(resposta); // 9
    expect(pergunta).toBeLessThan(recebida);
    expect(resposta).toBeLessThan(chegada);
  });
});
