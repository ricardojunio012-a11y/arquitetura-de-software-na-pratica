// O mês de referência da cobrança e as datas que dependem dele.
export interface Competencia {
  hoje: Date;
  rotulo: string; // "03/2026"
  codigo: string; // "202603"
  vencimento: string; // "10/03/2026"
  limiteDesconto: string; // "05/03/2026"
}

export function competenciaDe(hoje: Date): Competencia {
  const ano = hoje.getUTCFullYear();
  const mes = String(hoje.getUTCMonth() + 1).padStart(2, "0");
  return {
    hoje,
    rotulo: `${mes}/${ano}`,
    codigo: `${ano}${mes}`,
    vencimento: `10/${mes}/${ano}`,
    limiteDesconto: `05/${mes}/${ano}`,
  };
}

// Dias corridos entre uma data (AAAA-MM-DD) e hoje
export function diasDesde(dataIso: string, hoje: Date): number {
  const inicio = Date.parse(dataIso + "T00:00:00Z");
  const fim = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.round((fim - inicio) / 86400000);
}
