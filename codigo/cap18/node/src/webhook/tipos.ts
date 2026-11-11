// O que trafega entre o gateway e o Morada.

export interface Evento {
  tipo: "cobranca.paga" | "cobranca.estornada";
  cobranca: string;
  valorCentavos: number;
  versao: number;
}

// Uma entrega HTTP: os três cabeçalhos do Standard Webhooks e o corpo bruto. A
// assinatura vale para o corpo exatamente como chegou, byte a byte.
export interface Entrega {
  cabecalhos: {
    "webhook-id": string;
    "webhook-timestamp": string;
    "webhook-signature": string;
  };
  corpo: string;
}

export interface Cobranca {
  cobranca: string;
  situacao: "aberta" | "paga" | "estornada";
  versao: number;
}

export interface Resposta {
  status: number;
  motivo: string;
}
