// Módulo de reservas. Etapa 5: fases separadas (Split Phase) e nenhum estado global.
// decidir() calcula; relatorio() e avisos() formatam; quem lê e grava é o main.
export interface Espaco {
  id: string;
  nome: string;
  taxa: number;
}

export interface Unidade {
  id: string;
  email: string;
  emDebito: boolean;
}

export interface Pedido {
  id: string;
  unidade: string;
  espaco: string;
  data: string;
  convidados: number;
}

export interface Decisao {
  pedido: Pedido;
  email: string;
  motivo: string | null;
  valor: number;
}

const ANTECEDENCIA_MINIMA_DIAS = 2;
const ACRESCIMO_SABADO_PORCENTO = 20;
const LIMITE_DE_CONVIDADOS = 50;
const TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

export function diasAte(dataIso: string, hoje: Date): number {
  const inicioDeHoje = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  return Math.round((Date.parse(dataIso + "T00:00:00Z") - inicioDeHoje) / 86400000);
}

// O comentário original dizia "fim de semana", mas o código só olha o sábado
export function ehSabado(dataIso: string): boolean {
  return new Date(dataIso + "T00:00:00Z").getUTCDay() === 6;
}

export function valorDaReserva(espaco: Espaco, pedido: Pedido): number {
  let valor = espaco.taxa;
  if (ehSabado(pedido.data)) valor += (valor * ACRESCIMO_SABADO_PORCENTO) / 100;
  if (pedido.convidados > LIMITE_DE_CONVIDADOS) valor += TAXA_DE_LIMPEZA_EXTRA;
  return valor;
}

export function motivoDaRecusa(
  pedido: Pedido,
  unidade: Unidade,
  hoje: Date,
  aprovadas: readonly Pedido[],
): string | null {
  if (unidade.emDebito) return "débito";
  if (diasAte(pedido.data, hoje) < ANTECEDENCIA_MINIMA_DIAS) return "antecedência";
  const ocupado = aprovadas.some(
    (r) => r.espaco === pedido.espaco && r.data === pedido.data,
  );
  return ocupado ? "conflito" : null;
}

// Fase 1: decidir cada pedido, em ordem. As aprovadas agora são locais.
export function decidir(
  dados: { espacos: Espaco[]; unidades: Unidade[]; pedidos: Pedido[] },
  hoje: Date,
): Decisao[] {
  const aprovadas: Pedido[] = [];
  return dados.pedidos.map((pedido) => {
    const unidade = dados.unidades.find((u) => u.id === pedido.unidade)!;
    const espaco = dados.espacos.find((e) => e.id === pedido.espaco)!;
    const motivo = motivoDaRecusa(pedido, unidade, hoje, aprovadas);
    if (motivo) return { pedido, email: unidade.email, motivo, valor: 0 };
    aprovadas.push(pedido);
    return {
      pedido,
      email: unidade.email,
      motivo,
      valor: valorDaReserva(espaco, pedido),
    };
  });
}

export function reais(centavos: number): string {
  return Math.floor(centavos / 100) + "," + String(centavos % 100).padStart(2, "0");
}

// Fase 2: formatar o relatório e os avisos a partir das decisões
export function relatorio(decisoes: readonly Decisao[]): string[] {
  return decisoes.map(({ pedido: p, motivo, valor }) => {
    const inicio = `${p.id};${p.unidade};${p.espaco};${p.data}`;
    return motivo
      ? `${inicio};recusada;${motivo}`
      : `${inicio};aprovada;${reais(valor)}`;
  });
}

export function avisos(
  decisoes: readonly Decisao[],
): { para: string; texto: string }[] {
  return decisoes.map(({ pedido, email, motivo, valor }) => ({
    para: email,
    texto: motivo
      ? `Reserva ${pedido.id} recusada (${motivo})`
      : `Reserva ${pedido.id} confirmada. Valor: R$ ${reais(valor)}`,
  }));
}
