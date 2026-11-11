// O receptor robusto: aceita a entrega legítima uma vez, recusa a adulterada e ignora
// a repetição, e não perde a entrega quando o efeito falha.
import { describe, expect, it } from "vitest";
import { entregar } from "../src/webhook/gateway.ts";
import { Caixa, ReceptorRobusto } from "../src/webhook/receptores.ts";

const SEGREDO = "whsec_" + Buffer.from("segredo-dos-testes").toString("base64");
const AGORA = 1793880000;
const envio = {
  id: "msg_t1",
  segundosAtras: 5,
  evento: { tipo: "cobranca.paga", cobranca: "C-1", valorCentavos: 100, versao: 2 },
} as const;

function receptor() {
  const caixa = new Caixa([{ cobranca: "C-1", situacao: "aberta", versao: 1 }]);
  return new ReceptorRobusto(caixa, SEGREDO, () => AGORA);
}

describe("receptor robusto", () => {
  it("aplica a entrega legítima uma vez só", () => {
    const r = receptor();
    const entrega = entregar(SEGREDO, AGORA, envio);
    expect(r.receber(entrega).status).toBe(200);
    expect(r.receber(entrega).motivo).toBe("repetida: ignorada");
    expect(r.caixa.pagamentos).toHaveLength(1);
  });

  it("recusa um corpo alterado depois de assinado", () => {
    const entrega = entregar(SEGREDO, AGORA, envio);
    const adulterada = { ...entrega, corpo: entrega.corpo.replace("100", "1") };
    expect(receptor().receber(adulterada).status).toBe(401);
  });

  it("não perde a entrega quando aplicar falha", () => {
    const r = receptor();
    const aplicar = r.caixa.aplicar.bind(r.caixa);
    let falhas = 1;
    r.caixa.aplicar = (evento) => {
      if (falhas-- > 0) throw new Error("banco fora do ar");
      aplicar(evento);
    };
    const entrega = entregar(SEGREDO, AGORA, envio);
    expect(() => r.receber(entrega)).toThrow("banco fora do ar");
    expect(r.receber(entrega).motivo).toBe("aplicado: C-1 cobranca.paga");
    expect(r.caixa.pagamentos).toHaveLength(1);
  });
});
