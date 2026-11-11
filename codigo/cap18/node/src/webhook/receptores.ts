// Dois receptores do mesmo webhook. O ingênuo acredita em tudo o que chega, na ordem
// em que chega. O robusto confere a assinatura e a janela de tempo, ignora repetições
// e não deixa um evento antigo desfazer um mais novo.
import { assinaturaConfere } from "./assinatura.ts";
import type { Cobranca, Entrega, Evento, Resposta } from "./tipos.ts";

const JANELA_SEGUNDOS = 5 * 60;

export class Caixa {
  readonly cobrancas = new Map<string, Cobranca>();
  readonly pagamentos: { cobranca: string; valorCentavos: number }[] = [];

  constructor(iniciais: Cobranca[]) {
    for (const c of iniciais) this.cobrancas.set(c.cobranca, { ...c });
  }

  aplicar(evento: Evento) {
    const situacao = evento.tipo === "cobranca.paga" ? "paga" : "estornada";
    this.cobrancas.set(evento.cobranca, {
      cobranca: evento.cobranca,
      situacao,
      versao: evento.versao,
    });
    if (situacao === "paga") {
      this.pagamentos.push({
        cobranca: evento.cobranca,
        valorCentavos: evento.valorCentavos,
      });
    }
  }
}

export class ReceptorIngenuo {
  readonly caixa: Caixa;

  constructor(caixa: Caixa) {
    this.caixa = caixa;
  }

  receber(entrega: Entrega): Resposta {
    const evento: Evento = JSON.parse(entrega.corpo);
    this.caixa.aplicar(evento);
    return { status: 200, motivo: `aplicado: ${evento.cobranca} ${evento.tipo}` };
  }
}

export class ReceptorRobusto {
  readonly caixa: Caixa;
  readonly #segredo: string;
  readonly #agora: () => number;
  // Em produção, numa tabela, gravada na mesma transação do efeito (capítulo 11)
  readonly #processadas = new Set<string>();

  constructor(caixa: Caixa, segredo: string, agora: () => number) {
    this.caixa = caixa;
    this.#segredo = segredo;
    this.#agora = agora;
  }

  receber(entrega: Entrega): Resposta {
    const id = entrega.cabecalhos["webhook-id"];
    const ts = Number(entrega.cabecalhos["webhook-timestamp"]);
    const assinatura = entrega.cabecalhos["webhook-signature"];
    // ① Quem mandou: só quem conhece o segredo produz esta assinatura para este corpo
    if (!assinaturaConfere(this.#segredo, id, ts, entrega.corpo, assinatura)) {
      return { status: 401, motivo: "assinatura inválida" };
    }
    // ② Quando: uma entrega válida, mas antiga, pode ser a repetição de um atacante
    if (Math.abs(this.#agora() - ts) > JANELA_SEGUNDOS) {
      return { status: 401, motivo: "fora da janela de 5 minutos" };
    }
    // ③ Repetição: responde 200, para o remetente parar de reenviar, e não faz nada
    if (this.#processadas.has(id)) {
      return { status: 200, motivo: "repetida: ignorada" };
    }
    // ④ Ordem: versão menor ou igual à atual quer dizer que o evento chegou atrasado
    const evento: Evento = JSON.parse(entrega.corpo);
    const atual = this.caixa.cobrancas.get(evento.cobranca);
    let resposta: Resposta;
    if (atual && evento.versao <= atual.versao) {
      const motivo = `não é mais nova que a ${atual.versao}`;
      resposta = { status: 200, motivo: `ignorada: versão ${evento.versao} ${motivo}` };
    } else {
      this.caixa.aplicar(evento);
      resposta = { status: 200, motivo: `aplicado: ${evento.cobranca} ${evento.tipo}` };
    }
    // Só depois do efeito: se aplicar falhar, a entrega não fica marcada, o remetente
    // reenvia e ela é tentada de novo. Em produção, a marca e o efeito vão na mesma
    // transação (capítulo 11).
    this.#processadas.add(id);
    return resposta;
  }
}
