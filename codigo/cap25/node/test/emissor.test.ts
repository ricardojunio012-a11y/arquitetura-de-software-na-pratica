// A contrapressão: com o semáforo, 30 chamadas simultâneas a um emissor que aceita 8
// passam todas, sem nenhuma recusa; sem ele, há recusas.
import { describe, expect, it } from "vitest";
import { BancoEmissor, Semaforo } from "../src/emissor.ts";

describe("contrapressão", () => {
  it("sem semáforo, o emissor recusa o excesso", async () => {
    const emissor = new BancoEmissor(8);
    await Promise.allSettled(Array.from({ length: 30 }, () => emissor.registrar()));
    expect(emissor.recusas).toBe(22);
  });

  it("com semáforo, todas passam e nenhuma é recusada", async () => {
    const emissor = new BancoEmissor(8);
    const semaforo = new Semaforo(8);
    await Promise.all(
      Array.from({ length: 30 }, () => semaforo.usar(() => emissor.registrar())),
    );
    expect(emissor.chamadas).toBe(30);
    expect(emissor.recusas).toBe(0);
  });
});
