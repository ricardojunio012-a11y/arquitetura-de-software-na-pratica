// O serviço de Comunicação do capítulo 12, agora com um repositório de avisos: o
// mesmo aviso pedido duas vezes é enviado uma vez só.
export class DadosInvalidosErro extends Error {}

export interface RepositorioDeAvisos {
  jaEnviado(id: string): Promise<boolean>;
  registrar(id: string, texto: string): Promise<void>;
}

export class Comunicacao {
  readonly #avisos: RepositorioDeAvisos;

  constructor(avisos: RepositorioDeAvisos) {
    this.#avisos = avisos;
  }

  async avisar(id: string, texto: string): Promise<"enviado" | "repetido"> {
    if (!texto) throw new DadosInvalidosErro("texto obrigatório");
    if (await this.#avisos.jaEnviado(id)) return "repetido";
    await this.#avisos.registrar(id, texto);
    return "enviado";
  }
}

export class AvisosEmMemoria implements RepositorioDeAvisos {
  readonly #avisos = new Map<string, string>();

  async jaEnviado(id: string) {
    return this.#avisos.has(id);
  }

  async registrar(id: string, texto: string) {
    this.#avisos.set(id, texto);
  }
}
