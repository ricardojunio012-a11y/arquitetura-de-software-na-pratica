// A função da prestação de contas: recebe os lançamentos do mês de um condomínio,
// gera o PDF e o grava no bucket. O mesmo arquivo roda nos testes, na simulação e,
// sem os tipos, como função no LocalStack. Por isso não importa outros arquivos .ts.
import { createHash } from "node:crypto";

export type Lancamento = { data: string; descricao: string; centavos: number };
export type Prestacao = {
  condominio: string;
  competencia: string; // "2026-10"
  lancamentos: Lancamento[];
};

const reais = (c: number) => {
  const s = (Math.abs(c) / 100).toFixed(2).replace(".", ",");
  return (c < 0 ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
// Texto de PDF: parênteses e barra invertida precisam de escape
const texto = (s: string) => s.replace(/[\\()]/g, (x) => "\\" + x);

// Um PDF mínimo, de uma página, com a fonte Courier, que todo leitor de PDF tem.
// A codificação WinAnsi (latin1) cobre os acentos do português.
export function gerarPdf(p: Prestacao): Buffer {
  const linhas = [
    `Prestação de contas - ${p.condominio} - ${p.competencia}`,
    "",
    ...p.lancamentos.map(
      (l) => `${l.data}  ${l.descricao.padEnd(34)} ${reais(l.centavos).padStart(14)}`,
    ),
    "",
    `Saldo do mês: R$ ${reais(p.lancamentos.reduce((a, l) => a + l.centavos, 0))}`,
  ];
  const conteudo = ["BT", "/F1 10 Tf", "14 TL", "50 790 Td"]
    .concat(linhas.map((l) => `(${texto(l)}) '`))
    .concat("ET")
    .join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier " +
      "/Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\n` +
      `stream\n${conteudo}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const posicoes: number[] = [];
  objetos.forEach((o, i) => {
    posicoes.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posicoes.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

// Fora do handler: roda uma vez por ambiente de execução (na partida a frio) e é
// reaproveitado pelas chamadas seguintes no mesmo ambiente
let s3: { send(c: unknown): Promise<unknown> } | undefined;

export async function handler(evento: Prestacao) {
  const pdf = gerarPdf(evento);
  const chave = `prestacoes/${evento.condominio}/${evento.competencia}.pdf`;
  const bucket = process.env.BUCKET;
  if (bucket) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    s3 ??= new S3Client({ forcePathStyle: true });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: chave,
        Body: pdf,
        ContentType: "application/pdf",
      }),
    );
  }
  // Devolve só a chave: o PDF fica no bucket (a resposta tem limite de 6 MB)
  const sha256 = createHash("sha256").update(pdf).digest("hex");
  return { chave, bytes: pdf.length, sha256 };
}
