// A entrada do laboratório: três condomínios publicam a prestação de contas
// de outubro, e o 102 publica duas vezes (o síndico clicou de novo).
export const PUBLICACOES: [string, string][] = [
  ["101", "2026-10"],
  ["102", "2026-10"],
  ["102", "2026-10"],
  ["103", "2026-10"],
];

// Um "PDF" de mentira, com tamanho previsível, para a saída ser sempre igual
export function pdfDeMentira(condominio: string, mes: string): Uint8Array {
  const linhas = [`%PDF-1.7`, `% Prestação de contas ${condominio} ${mes}`];
  for (let i = 1; i <= 10 + (Number(condominio) % 5); i++) {
    linhas.push(`lançamento ${i}: R$ ${(i * 137.5).toFixed(2)}`);
  }
  return new TextEncoder().encode(linhas.join("\n") + "\n%%EOF\n");
}
