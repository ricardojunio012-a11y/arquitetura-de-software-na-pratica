// Cenários de qualidade executáveis: geram carga sintética, medem o que é nosso,
// estimam o que depende de terceiros e comparam o total com a meta.
import { calcularCobranca, type Unidade } from "./cobranca/calculo.ts";
import { competenciaDe } from "./cobranca/competencia.ts";
import { formatarEmail } from "./cobranca/notificacao.ts";
import { Boleto } from "./cobranca/pagamento.ts";

export interface Cenario {
  id: string;
  descricao: string;
  condominios: number;
  unidadesPorCondominio: number;
  registrosPorSegundo: number; // capacidade do banco emissor para registrar boletos
  limiteSegundos: number;
}

export interface Resultado {
  cenario: Cenario;
  cobrancas: number;
  segundosCalculo: number; // medido
  segundosRegistro: number; // estimado
  bytesAvisos: number;
  passou: boolean;
}

// Condomínio sintético e determinístico: a mesma carga em qualquer linguagem
export function condominioSintetico(i: number, unidades: number) {
  const lista: Unidade[] = [];
  for (let k = 1; k <= unidades; k++) {
    lista.push({
      id: `U-${k}`,
      fracaoMilionesimos: Math.floor(1000000 / unidades),
      morador: {
        nome: `Morador ${k}`,
        email: `morador${k}@exemplo.com`,
        canal: "email",
      },
      meioPagamento: "boleto",
      debitoAnterior:
        k % 7 === 0 ? { valorCentavos: 50000, vencimento: "2026-02-10" } : null,
    });
  }
  const despesas = 3000000 + (i % 50) * 10000;
  return {
    condominio: {
      id: `cond-${i}`,
      nome: `Condomínio ${i}`,
      despesasDoMesCentavos: despesas,
    },
    unidades: lista,
  };
}

// A medida de resposta do cenário: terminar dentro do limite
export function avaliar(segundos: number, limiteSegundos: number): boolean {
  return segundos <= limiteSegundos;
}

export function executar(cenario: Cenario, hoje: Date): Resultado {
  const boleto = new Boleto();
  const competencia = competenciaDe(hoje);
  let cobrancas = 0;
  let bytesAvisos = 0;
  const inicio = performance.now();
  for (let i = 1; i <= cenario.condominios; i++) {
    const { condominio, unidades } = condominioSintetico(
      i,
      cenario.unidadesPorCondominio,
    );
    for (const unidade of unidades) {
      const cobranca = calcularCobranca(
        condominio.despesasDoMesCentavos,
        unidade,
        hoje,
      );
      const codigo = boleto.gerarCodigo(condominio.id, competencia, cobranca);
      const pagamento = { nome: boleto.nome, codigo };
      const aviso = formatarEmail({
        condominio: condominio.nome,
        competencia,
        cobranca,
        pagamento,
      });
      bytesAvisos += Buffer.byteLength(aviso);
      cobrancas++;
    }
  }
  const segundosCalculo = (performance.now() - inicio) / 1000;
  // O registro dos boletos depende do banco emissor: estimamos pela capacidade dele
  const segundosRegistro = cobrancas / cenario.registrosPorSegundo;
  const total = segundosCalculo + segundosRegistro;
  return {
    cenario,
    cobrancas,
    segundosCalculo,
    segundosRegistro,
    bytesAvisos,
    passou: avaliar(total, cenario.limiteSegundos),
  };
}
