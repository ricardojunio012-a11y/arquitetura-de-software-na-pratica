// Testes de unidade da etapa 3: possíveis porque o cálculo foi separado do resto.
import { describe, expect, it } from "vitest";
import { gerarCobrancaMensal } from "../src/etapa3/aplicacao.ts";
import { calcularCobranca, type Unidade } from "../src/etapa3/calculo.ts";
import type { Aviso, Notificador } from "../src/etapa3/notificacao.ts";
import { Boleto } from "../src/etapa3/pagamento.ts";

const hoje = new Date("2026-03-02T00:00:00Z");

// O falso: em vez de enviar, guarda os avisos numa lista para o teste conferir
class NotificadorFalso implements Notificador {
  readonly avisos: Aviso[] = [];

  notificar(aviso: Aviso): void {
    this.avisos.push(aviso);
  }
}

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

describe("calcularCobranca", () => {
  it("divide as despesas pela fração ideal e soma 10% de fundo de reserva", () => {
    const c = calcularCobranca(485000, unidade(), hoje);
    expect(c.taxa).toBe(60625);
    expect(c.fundo).toBe(6063);
    expect(c.total).toBe(66688);
  });

  it("cobra multa de 2% e juros de 1% ao mês proporcionais aos dias de atraso", () => {
    const c = calcularCobranca(
      485000,
      unidade({ debitoAnterior: { valorCentavos: 66750, vencimento: "2026-02-10" } }),
      hoje,
    );
    expect(c.multa).toBe(1335);
    expect(c.juros).toBe(445); // 20 dias
    expect(c.total).toBe(66688 + 66750 + 1335 + 445);
  });
});

describe("gerarCobrancaMensal", () => {
  it("avisa cada morador uma vez, sem enviar nada de verdade", () => {
    const notificador = new NotificadorFalso();
    const dados = {
      condominio: {
        id: "teste",
        nome: "Condomínio Teste",
        despesasDoMesCentavos: 100000,
      },
      unidades: [
        unidade({ fracaoMilionesimos: 500000 }),
        unidade({ id: "A-102", fracaoMilionesimos: 500000 }),
      ],
    };
    gerarCobrancaMensal(dados, hoje, new Boleto(), notificador);
    const avisos = notificador.avisos;
    expect(avisos.map((a) => a.cobranca.unidade.id)).toEqual(["A-101", "A-102"]);
    expect(avisos[0].pagamento.codigo).toBe("BOL-teste-202603-A-101-55000");
  });
});
