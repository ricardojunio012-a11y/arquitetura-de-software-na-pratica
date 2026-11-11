// Feature flags por condomínio. Uma flag pode estar desligada para todos, ligada
// para uma lista de condomínios ou para um percentual deles. O percentual é estável:
// o mesmo condomínio cai sempre do mesmo lado, e subir de 10% para 20% só acrescenta
// condomínios, sem tirar nenhum.
import { createHash } from "node:crypto";

export type Regra = { ligada: boolean; condominios: number[]; percentual: number };

// Um número de 0 a 99, fixo para cada par (flag, condomínio)
export function balde(flag: string, condominio: number): number {
  const hash = createHash("sha256").update(`${flag}:${condominio}`).digest();
  return hash.readUInt32BE(0) % 100;
}

export function ativa(flag: string, regra: Regra, condominio: number): boolean {
  if (!regra.ligada) return false; // o interruptor geral vence tudo
  if (regra.condominios.includes(condominio)) return true;
  return balde(flag, condominio) < regra.percentual;
}
