// O relógio lógico de Lamport: um contador que cada processo incrementa a cada evento
// e que, ao receber uma mensagem, salta para depois do relógio de quem a enviou. Ele
// não diz que horas são; diz que, se um evento causou outro, o primeiro tem número
// menor.
export class RelogioDeLamport {
  #valor = 0;

  // Um evento local, inclusive enviar uma mensagem: devolve a marca do evento
  tique(): number {
    return ++this.#valor;
  }

  // Ao receber uma mensagem com a marca de quem enviou
  receber(marca: number): number {
    this.#valor = Math.max(this.#valor, marca) + 1;
    return this.#valor;
  }
}
