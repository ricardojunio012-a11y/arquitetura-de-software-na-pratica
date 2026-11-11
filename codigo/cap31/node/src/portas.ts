// As portas: o que o Morada precisa da nuvem, dito na língua do Morada.
// Nenhuma delas fala de bucket, de fila SQS ou de tabela DynamoDB.

// Porta de saída: guardar e ler arquivos, como o PDF da prestação de contas
export interface Arquivos {
  guardar(caminho: string, conteudo: Uint8Array, tipo: string): Promise<void>;
  ler(caminho: string): Promise<Uint8Array | undefined>;
}

// Porta de saída: tarefas para fazer depois. A entrega é "pelo menos uma vez":
// quem recebe confirma depois de fazer; sem confirmação, a tarefa volta
export interface Tarefas {
  publicar(tarefa: Tarefa): Promise<void>;
  receber(maximo: number): Promise<TarefaRecebida[]>;
  confirmar(recebida: TarefaRecebida): Promise<void>;
}

export interface Tarefa {
  tipo: "avisar-moradores";
  condominio: string;
  mes: string;
}

export interface TarefaRecebida {
  tarefa: Tarefa;
  recibo: string;
}

// Porta de saída: o índice dos documentos publicados por condomínio
export interface Documentos {
  // Grava só se ainda não existe; devolve false se já existia
  registrarSeNovo(documento: Documento): Promise<boolean>;
  // Devolve o que acabou de ser gravado: a leitura precisa ser consistente
  doCondominio(condominio: string): Promise<Documento[]>;
}

export interface Documento {
  condominio: string;
  mes: string;
  caminho: string;
  bytes: number;
}

// O que o núcleo recebe: as três portas, sem saber quem as implementa
export interface Nuvem {
  arquivos: Arquivos;
  tarefas: Tarefas;
  documentos: Documentos;
}
