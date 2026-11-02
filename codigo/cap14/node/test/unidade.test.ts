// Testes de unidade: a regra do serviço, sem rede e sem banco. Rodam em milissegundos.
import { describe, expect, it } from "vitest";
import {
  AvisosEmMemoria,
  Comunicacao,
  DadosInvalidosErro,
} from "../src/comunicacao/dominio.ts";

describe("unidade: Comunicação", () => {
  it("envia um aviso novo", async () => {
    const comunicacao = new Comunicacao(new AvisosEmMemoria());
    expect(await comunicacao.avisar("E-1", "pagamento recebido")).toBe("enviado");
  });

  it("reconhece um aviso repetido", async () => {
    const comunicacao = new Comunicacao(new AvisosEmMemoria());
    await comunicacao.avisar("E-1", "pagamento recebido");
    expect(await comunicacao.avisar("E-1", "pagamento recebido")).toBe("repetido");
  });

  it("recusa um aviso sem texto", async () => {
    const comunicacao = new Comunicacao(new AvisosEmMemoria());
    await expect(comunicacao.avisar("E-1", "")).rejects.toThrow(DadosInvalidosErro);
  });
});
