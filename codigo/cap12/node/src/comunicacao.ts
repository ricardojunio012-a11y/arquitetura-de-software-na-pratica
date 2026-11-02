// O módulo de Comunicação: envia avisos aos moradores. É idempotente pelo
// identificador do aviso: o mesmo aviso pedido duas vezes é enviado uma vez só.
export class Comunicacao {
  readonly #enviados = new Set<string>();

  // Devolve true se enviou agora e false se o aviso já tinha sido enviado
  avisar(id: string, _texto: string): boolean {
    if (this.#enviados.has(id)) return false;
    this.#enviados.add(id);
    return true;
  }
}
