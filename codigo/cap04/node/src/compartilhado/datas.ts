// Datas no formato ISO (AAAA-MM-DD) e "hoje" recebido por parâmetro.
export function diasEntre(dataIso: string, hoje: Date): number {
  return Math.round((hoje.getTime() - Date.parse(dataIso + "T00:00:00Z")) / 86400000);
}

export function dataDoMes(hoje: Date, dia: number): string {
  return hoje.toISOString().slice(0, 8) + String(dia).padStart(2, "0");
}

export function rotuloDoMes(hoje: Date): string {
  return `${String(hoje.getUTCMonth() + 1).padStart(2, "0")}/${hoje.getUTCFullYear()}`;
}

// 2026-03-10 -> 10/03
export function diaMes(dataIso: string): string {
  return `${dataIso.slice(8, 10)}/${dataIso.slice(5, 7)}`;
}

// 2026-03-10 -> 10/03/2026
export function dataBr(dataIso: string): string {
  return `${diaMes(dataIso)}/${dataIso.slice(0, 4)}`;
}
