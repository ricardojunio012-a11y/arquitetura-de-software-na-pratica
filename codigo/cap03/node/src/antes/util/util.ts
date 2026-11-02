// Utilidades diversas: o que não coube em outro lugar (coesão por coincidência).
import { config } from "../config/config.ts";

export function reais(c: number): string {
  return (
    Math.floor(c / 100).toLocaleString("pt-BR") + "," + String(c % 100).padStart(2, "0")
  );
}

// Depende, sem avisar, da data guardada na configuração global
export function diasDeAtraso(vencimento: string): number {
  return Math.round(
    (config.hoje.getTime() - Date.parse(vencimento + "T00:00:00Z")) / 86400000,
  );
}

export function competencia(): string {
  const mes = String(config.hoje.getUTCMonth() + 1).padStart(2, "0");
  return `${mes}/${config.hoje.getUTCFullYear()}`;
}
