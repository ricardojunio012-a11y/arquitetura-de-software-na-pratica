// Datas recebidas por parâmetro: nada de relógio escondido.
export function diasEntre(dataIso: string, hoje: Date): number {
  return Math.round((hoje.getTime() - Date.parse(dataIso + "T00:00:00Z")) / 86400000);
}

export function rotuloDoMes(hoje: Date): string {
  return `${String(hoje.getUTCMonth() + 1).padStart(2, "0")}/${hoje.getUTCFullYear()}`;
}
