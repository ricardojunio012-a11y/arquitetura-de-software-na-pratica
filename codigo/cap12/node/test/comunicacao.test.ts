// Testes: o módulo de Comunicação é o mesmo dentro e fora do monólito.
import { describe, expect, it } from "vitest";
import { Comunicacao } from "../src/comunicacao.ts";

describe("Comunicação", () => {
  it("envia cada aviso uma vez só, mesmo pedido de novo", () => {
    const comunicacao = new Comunicacao();
    expect(comunicacao.avisar("E-P-001", "pagamento recebido")).toBe(true);
    expect(comunicacao.avisar("E-P-001", "pagamento recebido")).toBe(false);
    expect(comunicacao.avisar("E-P-002", "pagamento recebido")).toBe(true);
  });
});
