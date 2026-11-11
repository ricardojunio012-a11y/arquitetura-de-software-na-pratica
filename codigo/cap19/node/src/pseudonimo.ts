// Pseudonimização: troca um identificador pessoal (CPF, placa) por um código que não
// revela o original. É um HMAC com uma chave guardada fora do banco analítico: o mesmo
// CPF gera sempre o mesmo código, o que permite contar e juntar dados por morador, mas
// sem a chave ninguém consegue voltar ao CPF, nem testar CPFs candidatos um a um.
import { createHmac } from "node:crypto";

export function pseudonimo(chave: string, valor: string): string {
  return createHmac("sha256", chave).update(valor).digest("hex").slice(0, 16);
}

// O que nunca pode chegar ao banco analítico em claro
export const PADROES_PESSOAIS = {
  cpf: /^\d{11}$/,
  placa: /^[A-Z]{3}\d[A-Z]\d{2}$/,
};

export function pareceDadoPessoal(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  for (const [nome, padrao] of Object.entries(PADROES_PESSOAIS)) {
    if (padrao.test(valor)) return nome;
  }
  return null;
}
