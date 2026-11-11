// Assinatura no formato Standard Webhooks: HMAC-SHA256 de "id.timestamp.corpo", com o
// segredo em base64 depois do prefixo whsec_, e o resultado em base64 depois de "v1,".
import { createHmac, timingSafeEqual } from "node:crypto";

export function assinar(segredo: string, id: string, ts: number, corpo: string) {
  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const hmac = createHmac("sha256", chave).update(`${id}.${ts}.${corpo}`);
  return `v1,${hmac.digest("base64")}`;
}

// O cabeçalho pode trazer várias assinaturas separadas por espaço (durante a troca de
// segredo, o remetente assina com o antigo e com o novo). A comparação em tempo
// constante não revela, pelo tempo de resposta, quantos caracteres conferem.
export function assinaturaConfere(
  segredo: string,
  id: string,
  ts: number,
  corpo: string,
  cabecalho: string,
): boolean {
  const esperada = Buffer.from(assinar(segredo, id, ts, corpo));
  return cabecalho.split(" ").some((recebida) => {
    const bytes = Buffer.from(recebida);
    return bytes.length === esperada.length && timingSafeEqual(bytes, esperada);
  });
}
