// O banco emissor dos boletos, simulado: aceita no máximo 8 chamadas ao mesmo tempo e
// recusa as que passam disso, como uma API com limite de concorrência.
export class Recusado extends Error {}

export class BancoEmissor {
  readonly limite: number;
  emAndamento = 0;
  recusas = 0;
  chamadas = 0;

  constructor(limite: number) {
    this.limite = limite;
  }

  async registrar(): Promise<void> {
    if (this.emAndamento >= this.limite) {
      this.recusas++;
      throw new Recusado("limite de chamadas simultâneas");
    }
    this.emAndamento++;
    this.chamadas++;
    try {
      await new Promise((ok) => setTimeout(ok, 5));
    } finally {
      this.emAndamento--;
    }
  }
}

// Contrapressão do lado de quem chama: um semáforo que deixa passar no máximo N
// chamadas ao mesmo tempo, e faz as outras esperarem a vez em vez de serem recusadas
export class Semaforo {
  #disponiveis: number;
  readonly #fila: (() => void)[] = [];

  constructor(n: number) {
    this.#disponiveis = n;
  }

  async usar<T>(funcao: () => Promise<T>): Promise<T> {
    if (this.#disponiveis === 0) await new Promise<void>((ok) => this.#fila.push(ok));
    else this.#disponiveis--;
    try {
      return await funcao();
    } finally {
      const proximo = this.#fila.shift();
      if (proximo) proximo();
      else this.#disponiveis++;
    }
  }
}
