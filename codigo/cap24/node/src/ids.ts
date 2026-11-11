// Identificadores de 64 bits no estilo do Instagram: 41 bits de tempo em milissegundos
// desde uma época própria, 13 bits do shard lógico e 10 bits de sequência. Cada shard
// gera os seus IDs sem falar com ninguém, os IDs ficam em ordem de criação, e o próprio
// ID diz em que shard a linha está.
const EPOCA_MS = BigInt(Date.UTC(2026, 0, 1));

export function gerarId(
  agoraMs: number,
  shardLogico: number,
  sequencia: number,
): bigint {
  return (
    ((BigInt(agoraMs) - EPOCA_MS) << 23n) |
    (BigInt(shardLogico) << 10n) |
    // A sequência dá a volta em 1.024: mais de 1.024 IDs no mesmo milissegundo e no
    // mesmo shard repetem os primeiros. Quem não aceita o limite espera o próximo ms
    BigInt(sequencia % 1024)
  );
}

export function lerId(id: bigint) {
  return {
    criadoEm: new Date(Number((id >> 23n) + EPOCA_MS)).toISOString(),
    shardLogico: Number((id >> 10n) & 0x1fffn),
    sequencia: Number(id & 0x3ffn),
  };
}
