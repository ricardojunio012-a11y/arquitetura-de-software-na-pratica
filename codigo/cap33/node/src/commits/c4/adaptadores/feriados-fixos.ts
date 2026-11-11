// Commit c4: os feriados nacionais numa lista, por ano
import type { Calendario } from "../dominio/calendario.ts";

const FERIADOS: Record<string, string[]> = {
  "2026": [
    "01-01",
    "04-03",
    "04-21",
    "05-01",
    "09-07",
    "10-12",
    "11-02",
    "11-15",
    "11-20",
    "12-25",
  ],
};

export class FeriadosFixos implements Calendario {
  ehDiaUtil(dia: string): boolean {
    const semana = new Date(Date.parse(dia)).getUTCDay();
    if (semana === 0 || semana === 6) return false;
    const lista = FERIADOS[dia.slice(0, 4)];
    if (!lista) throw new Error(`feriados de ${dia.slice(0, 4)} não cadastrados`);
    return !lista.includes(dia.slice(5));
  }
}
