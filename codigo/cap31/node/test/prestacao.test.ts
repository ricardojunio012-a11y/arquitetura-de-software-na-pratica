// O núcleo testado só com os adaptadores em memória: sem rede, sem nuvem.
import { describe, expect, it } from "vitest";
import { pdfDeMentira } from "../src/entrada.ts";
import { nuvemEmMemoria } from "../src/memoria.ts";
import { avisarMoradores, publicarPrestacao } from "../src/prestacao.ts";

describe("publicar a prestação de contas", () => {
  it("publicar duas vezes gera um aviso só", async () => {
    const nuvem = nuvemEmMemoria();
    const pdf = pdfDeMentira("102", "2026-10");
    expect(await publicarPrestacao(nuvem, "102", "2026-10", pdf)).toBe("publicada");
    expect(await publicarPrestacao(nuvem, "102", "2026-10", pdf)).toBe("repetida");
    const avisos = await avisarMoradores(nuvem);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain(`${pdf.length} bytes`);
  });
});
