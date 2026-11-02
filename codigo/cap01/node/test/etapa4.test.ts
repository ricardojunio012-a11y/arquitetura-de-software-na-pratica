// Testes de unidade das três mudanças, feitas sobre o código refatorado.
import { describe, expect, it } from "vitest";
import { gerarCobrancaMensal } from "../src/etapa4/aplicacao.ts";
import { calcularCobranca, type Unidade } from "../src/etapa4/calculo.ts";
import type { Aviso, Notificador } from "../src/etapa4/notificacao.ts";
import { Boleto } from "../src/etapa4/pagamento.ts";
import { Pix } from "../src/etapa4/pix.ts";

const hoje = new Date("2026-03-02T00:00:00Z");

function unidade(extra: Partial<Unidade> = {}): Unidade {
  return {
    id: "A-101",
    fracaoMilionesimos: 125000,
    morador: { nome: "Ana", email: "ana@example.com", canal: "email" },
    meioPagamento: "boleto",
    debitoAnterior: null,
    ...extra,
  };
}

describe("desconto por pontualidade", () => {
  it("dá 5% de desconto sobre a taxa para quem não tem débito", () => {
    const c = calcularCobranca(485000, unidade(), hoje);
    expect(c.totalAte05).toBe(66688 - 3031);
  });

  it("não dá desconto para quem tem débito anterior", () => {
    const c = calcularCobranca(
      485000,
      unidade({ debitoAnterior: { valorCentavos: 1000, vencimento: "2026-02-10" } }),
      hoje,
    );
    expect(c.totalAte05).toBeNull();
  });
});

describe("escolha do meio de pagamento e do canal", () => {
  it("usa o Pix e o WhatsApp quando a unidade pede", () => {
    const porCanal: Record<string, string[]> = { email: [], whatsapp: [] };
    const fake = (canal: string): Notificador => ({
      notificar: (aviso: Aviso) => porCanal[canal].push(aviso.pagamento.codigo),
    });
    const dados = {
      condominio: {
        id: "teste",
        nome: "Condomínio Teste",
        despesasDoMesCentavos: 100000,
      },
      unidades: [
        unidade({ fracaoMilionesimos: 500000 }),
        unidade({
          id: "A-102",
          fracaoMilionesimos: 500000,
          meioPagamento: "pix",
          morador: {
            nome: "Bia",
            email: "bia@example.com",
            telefone: "+5511900000000",
            canal: "whatsapp",
          },
        }),
      ],
    };
    gerarCobrancaMensal(
      dados,
      hoje,
      { boleto: new Boleto(), pix: new Pix() },
      { email: fake("email"), whatsapp: fake("whatsapp") },
    );
    expect(porCanal.email).toEqual(["BOL-teste-202603-A-101-55000"]);
    expect(porCanal.whatsapp).toEqual(["PIX-teste-202603-A-102-55000"]);
  });
});
