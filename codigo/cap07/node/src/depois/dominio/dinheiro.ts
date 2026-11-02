// Objeto de valor: imutável, comparado pelo valor e dono das próprias regras.
import { ErroDeDominio } from "./erro.ts";

export class Dinheiro {
  readonly centavos: number;

  private constructor(centavos: number) {
    if (!Number.isInteger(centavos) || centavos < 0) {
      throw new ErroDeDominio(
        "valor em dinheiro deve ser um número inteiro de centavos",
      );
    }
    this.centavos = centavos;
  }

  static deCentavos(centavos: number): Dinheiro {
    return new Dinheiro(centavos);
  }

  static readonly ZERO = new Dinheiro(0);

  somar(outro: Dinheiro): Dinheiro {
    return new Dinheiro(this.centavos + outro.centavos);
  }

  // Percentual com arredondamento meio para cima, sempre no mesmo lugar
  percentual(porcento: number): Dinheiro {
    return new Dinheiro(Math.floor((this.centavos * porcento + 50) / 100));
  }

  igual(outro: Dinheiro): boolean {
    return this.centavos === outro.centavos;
  }

  // R$ 1.234,56
  toString(): string {
    const inteiro = String(Math.floor(this.centavos / 100)).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    );
    return `R$ ${inteiro},${String(this.centavos % 100).padStart(2, "0")}`;
  }
}
