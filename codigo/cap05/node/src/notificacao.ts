// Strategy (os canais), Decorator (retentativas e registro) e Factory (a fábrica).
import type { Morador } from "./tipos.ts";

export interface Mensagem {
  titulo: string;
  texto: string;
}

export interface Canal {
  readonly nome: string;
  enviar(morador: Morador, mensagem: Mensagem): void;
}

// Falha que pode passar numa nova tentativa (provedor fora do ar, limite de uso)
export class ErroPassageiro extends Error {}

// Falha que se repete em toda tentativa (endereço inexistente, número inválido)
export class ErroDefinitivo extends Error {}

// Simula os provedores de e-mail, WhatsApp e SMS. Alguns destinos falham
// nas primeiras tentativas, como acontece com provedores de verdade, e
// outros são inválidos e falham sempre.
export class ProvedorSimulado {
  readonly #falhas: Map<string, number>;
  readonly #invalidos: Set<string>;
  readonly entregues: string[] = [];

  constructor(falhas: Record<string, number>, invalidos: string[] = []) {
    this.#falhas = new Map(Object.entries(falhas));
    this.#invalidos = new Set(invalidos);
  }

  entregar(canal: string, destino: string, texto: string): void {
    if (this.#invalidos.has(destino)) throw new ErroDefinitivo("destino inexistente");
    const restantes = this.#falhas.get(destino) ?? 0;
    if (restantes > 0) {
      this.#falhas.set(destino, restantes - 1);
      throw new ErroPassageiro("provedor indisponível");
    }
    this.entregues.push(`${canal} ${destino} | ${texto}`);
  }
}

// Cada estratégia sabe o endereço e o formato do seu canal
export class Email implements Canal {
  readonly nome = "email";
  readonly #provedor: ProvedorSimulado;

  constructor(provedor: ProvedorSimulado) {
    this.#provedor = provedor;
  }

  enviar(morador: Morador, m: Mensagem): void {
    this.#provedor.entregar(this.nome, morador.email, `${m.titulo}: ${m.texto}`);
  }
}

export class WhatsApp implements Canal {
  readonly nome = "whatsapp";
  readonly #provedor: ProvedorSimulado;

  constructor(provedor: ProvedorSimulado) {
    this.#provedor = provedor;
  }

  enviar(morador: Morador, m: Mensagem): void {
    this.#provedor.entregar(this.nome, morador.telefone!, `*${m.titulo}* ${m.texto}`);
  }
}

export class Sms implements Canal {
  readonly nome = "sms";
  readonly #provedor: ProvedorSimulado;

  constructor(provedor: ProvedorSimulado) {
    this.#provedor = provedor;
  }

  // SMS é curto: só o título, e o detalhe fica no aplicativo
  enviar(morador: Morador, m: Mensagem): void {
    this.#provedor.entregar(this.nome, morador.telefone!, `Morada: ${m.titulo}`);
  }
}

// Decorator: registra cada tentativa sem que o canal saiba que é observado
export class ComRegistro implements Canal {
  readonly #canal: Canal;
  readonly #registro: string[];

  constructor(canal: Canal, registro: string[]) {
    this.#canal = canal;
    this.#registro = registro;
  }

  get nome(): string {
    return this.#canal.nome;
  }

  enviar(morador: Morador, mensagem: Mensagem): void {
    const quem = `${this.nome} para ${morador.nome}`;
    try {
      this.#canal.enviar(morador, mensagem);
      this.#registro.push(`${quem}: entregue (${mensagem.titulo})`);
    } catch (erro) {
      this.#registro.push(`${quem}: falhou (${(erro as Error).message})`);
      throw erro;
    }
  }
}

// Quem espera entre as tentativas: em produção, um timer; no laboratório, um
// relógio simulado que só anota a espera, para a saída ser sempre a mesma
export type Esperar = (ms: number, quem: string) => void;

// Decorator: tenta de novo antes de desistir, só quando a falha é passageira,
// e espera cada vez mais entre as tentativas (100 ms, 200 ms, 400 ms...)
export class ComRetentativas implements Canal {
  readonly #canal: Canal;
  readonly #tentativas: number;
  readonly #esperar: Esperar;
  readonly #esperaInicialMs: number;

  constructor(canal: Canal, tentativas: number, esperar: Esperar, esperaMs = 100) {
    this.#canal = canal;
    this.#tentativas = tentativas;
    this.#esperar = esperar;
    this.#esperaInicialMs = esperaMs;
  }

  get nome(): string {
    return this.#canal.nome;
  }

  enviar(morador: Morador, mensagem: Mensagem): void {
    for (let tentativa = 1; ; tentativa++) {
      try {
        return this.#canal.enviar(morador, mensagem);
      } catch (erro) {
        // Repetir uma falha definitiva só gasta tempo e cota do provedor
        if (!(erro instanceof ErroPassageiro)) {
          const motivo = (erro as Error).message;
          throw new Error(`${this.nome} falhou sem nova tentativa (${motivo})`);
        }
        if (tentativa === this.#tentativas) {
          throw new Error(`${this.nome} sem sucesso após ${tentativa} tentativas`);
        }
        const espera = this.#esperaInicialMs * 2 ** (tentativa - 1);
        this.#esperar(espera, `${this.nome} para ${morador.nome}`);
      }
    }
  }
}

// Factory: escolhe a estratégia pela preferência do morador e a embrulha nos
// decoradores. Quem envia avisos não conhece nenhuma classe concreta.
export class FabricaDeCanais {
  readonly #canais: Map<string, Canal>;
  readonly #registro: string[];
  readonly #esperar: Esperar;

  constructor(provedor: ProvedorSimulado, registro: string[], esperar: Esperar) {
    const canais = [new Email(provedor), new WhatsApp(provedor), new Sms(provedor)];
    this.#canais = new Map(canais.map((c) => [c.nome, c]));
    this.#registro = registro;
    this.#esperar = esperar;
  }

  para(morador: Morador): Canal {
    const canal = this.#canais.get(morador.canal) ?? this.#canais.get("email")!;
    // A ordem importa: retentativas por fora, registro por dentro
    const comRegistro = new ComRegistro(canal, this.#registro);
    return new ComRetentativas(comRegistro, 3, this.#esperar);
  }
}
