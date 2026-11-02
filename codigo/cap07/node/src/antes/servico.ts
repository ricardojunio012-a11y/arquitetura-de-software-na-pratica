// Serviço que concentra todas as regras. As regras só valem se quem altera os dados
// lembrar de passar por aqui; nada impede outro código de mexer nas reservas direto.
import { reservas, Reserva, type Espaco } from "./modelo.ts";

function dias(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / 86400000);
}

function formatar(centavos: number): string {
  const inteiro = String(Math.floor(centavos / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, "0")}`;
}

export function reservar(c: any, espaco: Espaco, eventos: string[]): string {
  if (c.fim <= c.inicio)
    return "recusada;período inválido: o fim deve ser depois do início";
  if (dias(c.em, c.data) < espaco.antecedenciaMinimaDias) {
    return "recusada;antecedência mínima não respeitada";
  }
  for (const r of reservas) {
    const mesmoHorario = r.data === c.data && r.inicio < c.fim && c.inicio < r.fim;
    if (r.espaco === c.espaco && r.situacao === "confirmada" && mesmoHorario) {
      return `recusada;horário sobreposto a ${r.id}`;
    }
  }
  const doMes = reservas.filter(
    (r) =>
      r.espaco === c.espaco &&
      r.unidade === c.unidade &&
      r.situacao === "confirmada" &&
      r.data.slice(0, 7) === c.data.slice(0, 7),
  );
  if (doMes.length >= espaco.limitePorMes)
    return "recusada;limite mensal da unidade atingido";

  const diaDaSemana = new Date(c.data + "T00:00:00Z").getUTCDay();
  let taxa = espaco.taxaCentavos;
  if (diaDaSemana === 0 || diaDaSemana === 6)
    taxa += Math.floor((taxa * 20 + 50) / 100);
  const r = new Reserva();
  Object.assign(r, {
    id: c.reserva,
    unidade: c.unidade,
    espaco: c.espaco,
    data: c.data,
  });
  Object.assign(r, { inicio: c.inicio, fim: c.fim, taxaCentavos: taxa });
  reservas.push(r);
  const periodo = `${c.data} ${c.inicio}h-${c.fim}h`;
  eventos.push(
    `ReservaConfirmada;${r.id};${r.espaco};${periodo};${r.unidade};${formatar(taxa)}`,
  );
  return `confirmada;${formatar(taxa)}`;
}

export function cancelar(c: any, eventos: string[]): string {
  const r = reservas.find((x) => x.id === c.reserva);
  if (!r) return "não cancelada;reserva não encontrada";
  if (r.situacao !== "confirmada") return "não cancelada;reserva não está confirmada";
  r.situacao = "cancelada";
  const multa =
    dias(c.em, r.data) < 2 ? Math.floor((r.taxaCentavos * 50 + 50) / 100) : 0;
  const detalhe = multa > 0 ? `multa ${formatar(multa)}` : "sem multa";
  eventos.push(`ReservaCancelada;${r.id};${detalhe}`);
  return `cancelada;${detalhe}`;
}
