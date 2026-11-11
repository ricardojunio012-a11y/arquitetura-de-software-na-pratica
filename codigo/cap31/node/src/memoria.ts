// Adaptadores em memória: as mesmas portas, sem nuvem nenhuma.
// Servem aos testes do núcleo e mostram que o núcleo não depende da AWS.
import type {
  Arquivos,
  Documento,
  Documentos,
  Nuvem,
  Tarefa,
  TarefaRecebida,
  Tarefas,
} from "./portas.ts";

export class ArquivosEmMemoria implements Arquivos {
  private arquivos = new Map<string, Uint8Array>();
  async guardar(caminho: string, conteudo: Uint8Array) {
    this.arquivos.set(caminho, conteudo);
  }
  async ler(caminho: string) {
    return this.arquivos.get(caminho);
  }
}

// Não imita o prazo de visibilidade do SQS: uma tarefa recebida e não
// confirmada fica presa aqui. É uma diferença conhecida entre os adaptadores
export class TarefasEmMemoria implements Tarefas {
  private fila: TarefaRecebida[] = [];
  private emAndamento = new Map<string, TarefaRecebida>();
  private proximo = 1;
  async publicar(tarefa: Tarefa) {
    this.fila.push({ tarefa, recibo: String(this.proximo++) });
  }
  async receber(maximo: number) {
    const lote = this.fila.splice(0, maximo);
    for (const r of lote) this.emAndamento.set(r.recibo, r);
    return lote;
  }
  async confirmar(recebida: TarefaRecebida) {
    this.emAndamento.delete(recebida.recibo);
  }
}

export class DocumentosEmMemoria implements Documentos {
  private documentos = new Map<string, Documento>();
  async registrarSeNovo(documento: Documento) {
    const chave = `${documento.condominio}|${documento.mes}`;
    if (this.documentos.has(chave)) return false;
    this.documentos.set(chave, { ...documento });
    return true;
  }
  async doCondominio(condominio: string) {
    return [...this.documentos.values()]
      .filter((d) => d.condominio === condominio)
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }
}

export const nuvemEmMemoria = (): Nuvem => ({
  arquivos: new ArquivosEmMemoria(),
  tarefas: new TarefasEmMemoria(),
  documentos: new DocumentosEmMemoria(),
});
