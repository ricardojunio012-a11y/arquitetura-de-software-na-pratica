// As costuras da etapa 2 em ação: com a data fixa e um correio falso, o módulo antigo
// roda dentro de um teste, sem depender do relógio e sem enviar e-mail nenhum.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { processarReservas } from "../src/etapa2/main.ts";

const entrada = fs.existsSync("/dados/entrada")
  ? "/dados/entrada"
  : `${import.meta.dirname}/../../entrada`;

// O correio falso: em vez de enviar, guarda cada mensagem numa lista
class CorreioFalso {
  readonly enviados: string[] = [];

  enviar(para: string, texto: string) {
    this.enviados.push(`${para}: ${texto}`);
  }
}

describe("etapa 2: pontos de costura", () => {
  it("roda com a data fixa e o correio falso", () => {
    const correio = new CorreioFalso();
    const saida = fs.mkdtempSync(path.join(os.tmpdir(), "etapa2-"));
    const hoje = new Date("2026-03-02T00:00:00Z");
    processarReservas(path.join(entrada, "reservas.json"), saida, hoje, correio);
    expect(correio.enviados).toHaveLength(8);
    expect(correio.enviados[0]).toBe(
      "ana.souza@example.com: Reserva R-01 confirmada. Valor: R$ 180,00",
    );
  });
});
