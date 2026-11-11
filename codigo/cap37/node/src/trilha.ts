// Trilha de auditoria encadeada por hash: cada registro guarda o hash do anterior.
import { createHash } from "node:crypto";

export type Registro = {
  seq: number;
  momento: string;
  ator: string;
  acao: string;
  alvo: string; // um identificador, nunca o dado pessoal em si
  anterior: string;
  hash: string;
};
export type Ancora = { seq: number; hash: string };
export const GENESE = "0".repeat(64);

export function calcularHash(r: Omit<Registro, "hash">): string {
  const campos = [r.seq, r.momento, r.ator, r.acao, r.alvo, r.anterior];
  return createHash("sha256").update(JSON.stringify(campos)).digest("hex");
}

export function encadear(
  ultimo: Registro | undefined,
  novo: Pick<Registro, "momento" | "ator" | "acao" | "alvo">,
): Registro {
  const base = {
    ...novo,
    seq: (ultimo?.seq ?? 0) + 1,
    anterior: ultimo?.hash ?? GENESE,
  };
  return { ...base, hash: calcularHash(base) };
}

export function verificar(trilha: Registro[], ancora?: Ancora): string[] {
  const problemas: string[] = [];
  let anterior = GENESE;
  for (const r of trilha) {
    if (r.anterior !== anterior)
      problemas.push(`registro ${r.seq}: elo quebrado, o anterior não confere`);
    if (calcularHash(r) !== r.hash)
      problemas.push(`registro ${r.seq}: conteúdo alterado depois de gravado`);
    anterior = r.hash;
  }
  if (ancora) {
    const r = trilha.find((x) => x.seq === ancora.seq);
    const ultimo = trilha.at(-1)?.seq ?? 0;
    if (!r)
      problemas.push(
        `âncora no registro ${ancora.seq}: ausente (a trilha termina no ${ultimo})`,
      );
    else if (r.hash !== ancora.hash)
      problemas.push(`âncora no registro ${ancora.seq}: hash diferente do publicado`);
  }
  return problemas;
}
