// O gateway de pagamento simulado: monta cada entrega como ela chegaria pela rede,
// assinada, e reproduz as falhas descritas no cenário.
import { assinar } from "./assinatura.ts";
import type { Entrega, Evento } from "./tipos.ts";

export interface Envio {
  id: string;
  segundosAtras: number;
  falha?: "reenvio" | "assinatura-falsa" | "mensagem-antiga";
  evento: Evento;
}

const SEGREDO_DO_ATACANTE =
  "whsec_" + Buffer.from("um-palpite-qualquer").toString("base64");

export function entregar(segredo: string, agora: number, envio: Envio): Entrega {
  const ts = agora - envio.segundosAtras;
  const corpo = JSON.stringify(envio.evento);
  // Quem não conhece o segredo só consegue assinar com outro
  const chave = envio.falha === "assinatura-falsa" ? SEGREDO_DO_ATACANTE : segredo;
  return {
    cabecalhos: {
      "webhook-id": envio.id,
      "webhook-timestamp": String(ts),
      "webhook-signature": assinar(chave, envio.id, ts, corpo),
    },
    corpo,
  };
}
