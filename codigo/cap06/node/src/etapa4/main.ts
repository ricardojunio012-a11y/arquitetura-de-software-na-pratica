// Módulo de reservas. Etapa 4: condicionais e números mágicos (Replace Nested
// Conditional with Guard Clauses, Replace Magic Literal, Replace Loop with Pipeline).
import fs from "node:fs";

const ANTECEDENCIA_MINIMA_DIAS = 2;
const ACRESCIMO_SABADO_PORCENTO = 20;
const LIMITE_DE_CONVIDADOS = 50;
const TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

var aprovadas: any[] = [];
var log: string[] = [];

var smtp = {
  enviar(para: string, texto: string) {
    log.push("para " + para + ": " + texto);
  },
};

function diasAte(dataIso: string, hoje: Date): number {
  const inicioDeHoje = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  return Math.round((Date.parse(dataIso + "T00:00:00Z") - inicioDeHoje) / 86400000);
}

// O comentário original dizia "fim de semana", mas o código só olha o sábado
function ehSabado(dataIso: string): boolean {
  return new Date(dataIso + "T00:00:00Z").getUTCDay() === 6;
}

function valorDaReserva(espaco: any, pedido: any): number {
  let valor = espaco.taxa;
  if (ehSabado(pedido.data)) valor += (valor * ACRESCIMO_SABADO_PORCENTO) / 100;
  if (pedido.convidados > LIMITE_DE_CONVIDADOS) valor += TAXA_DE_LIMPEZA_EXTRA;
  return valor;
}

function reais(centavos: number): string {
  return Math.floor(centavos / 100) + "," + String(centavos % 100).padStart(2, "0");
}

// Cláusulas de guarda: a primeira regra que falha devolve o motivo
function motivoDaRecusa(pedido: any, unidade: any, hoje: Date): string | null {
  if (unidade.emDebito) return "débito";
  if (diasAte(pedido.data, hoje) < ANTECEDENCIA_MINIMA_DIAS) return "antecedência";
  const ocupado = aprovadas.some(
    (r) => r.espaco === pedido.espaco && r.data === pedido.data,
  );
  if (ocupado) return "conflito";
  return null;
}

export function processarReservas(
  arquivo: string,
  pasta: string,
  hoje: Date = new Date(),
  correio = smtp,
) {
  const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const linhas: string[] = [];
  for (const pedido of dados.pedidos) {
    const unidade = dados.unidades.find((u: any) => u.id === pedido.unidade);
    const espaco = dados.espacos.find((e: any) => e.id === pedido.espaco);
    const motivo = motivoDaRecusa(pedido, unidade, hoje);
    const inicio = `${pedido.id};${pedido.unidade};${pedido.espaco};${pedido.data}`;
    if (motivo) {
      linhas.push(`${inicio};recusada;${motivo}`);
      correio.enviar(unidade.email, `Reserva ${pedido.id} recusada (${motivo})`);
      continue;
    }
    const valor = reais(valorDaReserva(espaco, pedido));
    aprovadas.push(pedido);
    linhas.push(`${inicio};aprovada;${valor}`);
    correio.enviar(
      unidade.email,
      `Reserva ${pedido.id} confirmada. Valor: R$ ${valor}`,
    );
  }
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(pasta + "/reservas.txt", linhas.join("\n") + "\n");
  fs.writeFileSync(pasta + "/emails.txt", log.join("\n") + "\n");
}

// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
processarReservas(entrada, saida, hoje);
