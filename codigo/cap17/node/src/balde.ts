// Balde de fichas: começa cheio, com "rajada" fichas, e ganha "porSegundo" fichas por
// segundo, sem passar do máximo. Cada pedido gasta uma ficha; sem ficha, o pedido é
// recusado. As fichas são contadas em milésimos para a conta ficar exata com o tempo
// em milissegundos.
export class BaldeDeFichas {
  #rajada: number;
  #porSegundo: number;
  #milesimos: number;
  #ultimo = 0;

  constructor(rajada: number, porSegundo: number) {
    this.#rajada = rajada;
    this.#porSegundo = porSegundo;
    this.#milesimos = rajada * 1000;
  }

  permite(agoraMs: number): boolean {
    const ganho = (agoraMs - this.#ultimo) * this.#porSegundo;
    this.#milesimos = Math.min(this.#rajada * 1000, this.#milesimos + ganho);
    this.#ultimo = agoraMs;
    if (this.#milesimos < 1000) return false;
    this.#milesimos -= 1000;
    return true;
  }
}
