// Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
import { calcularCobranca, type Unidade } from "./calculo.ts";
import { competenciaDe } from "./competencia.ts";
import type { Notificador } from "./notificacao.ts";
import type { MeioDePagamento } from "./pagamento.ts";
import { RelatorioDeCobrancas } from "./relatorio.ts";

export interface DadosDoCondominio {
  condominio: { id: string; nome: string; despesasDoMesCentavos: number };
  unidades: Unidade[];
}

export function gerarCobrancaMensal(
  dados: DadosDoCondominio,
  hoje: Date,
  meiosDePagamento: Record<string, MeioDePagamento>,
  notificadores: Record<string, Notificador>,
): RelatorioDeCobrancas {
  const { condominio } = dados;
  const competencia = competenciaDe(hoje);
  const relatorio = new RelatorioDeCobrancas(condominio.nome, competencia);
  for (const unidade of dados.unidades) {
    const pagamento = meiosDePagamento[unidade.meioPagamento];
    const notificador = notificadores[unidade.morador.canal];
    const cobranca = calcularCobranca(condominio.despesasDoMesCentavos, unidade, hoje);
    const codigo = pagamento.gerarCodigo(condominio.id, competencia, cobranca);
    relatorio.adicionar(cobranca, codigo);
    notificador.notificar({
      condominio: condominio.nome,
      competencia,
      cobranca,
      pagamento: { nome: pagamento.nome, codigo },
    });
  }
  return relatorio;
}
