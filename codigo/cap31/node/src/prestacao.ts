// O núcleo: publicar a prestação de contas do mês e avisar os moradores.
// Conhece só as portas; não sabe em que nuvem está.
import type { Nuvem } from "./portas.ts";

export const caminhoDaPrestacao = (condominio: string, mes: string) =>
  `prestacoes/${condominio}/${mes}.pdf`;

export async function publicarPrestacao(
  nuvem: Nuvem,
  condominio: string,
  mes: string,
  pdf: Uint8Array,
): Promise<"publicada" | "repetida"> {
  const caminho = caminhoDaPrestacao(condominio, mes);
  await nuvem.arquivos.guardar(caminho, pdf, "application/pdf");
  const documento = { condominio, mes, caminho, bytes: pdf.length };
  if (!(await nuvem.documentos.registrarSeNovo(documento))) return "repetida";
  await nuvem.tarefas.publicar({ tipo: "avisar-moradores", condominio, mes });
  return "publicada";
}

// O worker: recebe as tarefas, confere o arquivo, avisa e só então confirma
export async function avisarMoradores(nuvem: Nuvem): Promise<string[]> {
  const avisos: string[] = [];
  for (;;) {
    const lote = await nuvem.tarefas.receber(10);
    if (lote.length === 0) return avisos.sort();
    for (const recebida of lote) {
      const { condominio, mes } = recebida.tarefa;
      const pdf = await nuvem.arquivos.ler(caminhoDaPrestacao(condominio, mes));
      const situacao = pdf ? `${pdf.length} bytes` : "arquivo não encontrado";
      avisos.push(`${condominio} ${mes}: aviso enviado, PDF com ${situacao}`);
      await nuvem.tarefas.confirmar(recebida);
    }
  }
}
