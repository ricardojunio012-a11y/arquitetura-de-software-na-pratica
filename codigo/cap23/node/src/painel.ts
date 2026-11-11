// O painel financeiro do síndico com cache-aside no Redis: procura no cache; se não
// achar, consulta o banco e guarda o resultado com prazo de validade. Três formas de
// buscar, que só diferem no que acontece quando muitos pedidos não acham a chave.
import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";

export interface Painel {
  recebido_centavos: number;
  em_aberto_centavos: number;
}

export type Origem = (condominio: number) => Promise<Painel>;

const VALIDADE_S = 60;
const chave = (condominio: number) => `painel:${condominio}`;

// Pega a trava só se ela estiver livre (NX), com prazo (PX), e devolve o dono
export async function pegarTrava(
  redis: RedisClientType,
  nome: string,
  prazoMs: number,
): Promise<string | null> {
  const dono = randomUUID();
  const pegou = await redis.set(nome, dono, { NX: true, PX: prazoMs });
  return pegou ? dono : null;
}

// A trava tem dono. Quem a pega grava nela um valor aleatório; ao soltar, um script
// compara o valor e apaga numa operação só, dentro do Redis. Sem isso, se a carga
// passar do prazo, a trava vence, outro processo a pega e o primeiro apaga a dele
const SOLTAR =
  'if redis.call("get", KEYS[1]) == ARGV[1] then ' +
  'return redis.call("del", KEYS[1]) else return 0 end';

export async function soltarTrava(
  redis: RedisClientType,
  nome: string,
  dono: string,
): Promise<boolean> {
  return (await redis.eval(SOLTAR, { keys: [nome], arguments: [dono] })) === 1;
}

export class PainelComCache {
  readonly #redis: RedisClientType;
  readonly #origem: Origem;
  readonly #emAndamento = new Map<number, Promise<Painel>>();

  constructor(redis: RedisClientType, origem: Origem) {
    this.#redis = redis;
    this.#origem = origem;
  }

  async #lerCache(condominio: number): Promise<Painel | null> {
    const guardado = await this.#redis.get(chave(condominio));
    return guardado ? JSON.parse(guardado) : null;
  }

  async #carregar(condominio: number): Promise<Painel> {
    const painel = await this.#origem(condominio);
    await this.#redis.set(chave(condominio), JSON.stringify(painel), {
      EX: VALIDADE_S,
    });
    return painel;
  }

  // Sem proteção: cada pedido que não acha a chave vai ao banco
  async semProtecao(condominio: number): Promise<Painel> {
    return (await this.#lerCache(condominio)) ?? this.#carregar(condominio);
  }

  // Promessa compartilhada: no mesmo processo, quem chega depois espera a carga que já
  // está em andamento, em vez de começar outra
  async comPromessa(condominio: number): Promise<Painel> {
    const guardado = await this.#lerCache(condominio);
    if (guardado) return guardado;
    let carga = this.#emAndamento.get(condominio);
    if (!carga) {
      carga = this.#carregar(condominio).finally(() =>
        this.#emAndamento.delete(condominio),
      );
      this.#emAndamento.set(condominio, carga);
    }
    return carga;
  }

  // Trava no Redis: entre processos, só quem consegue a trava vai ao banco; os outros
  // esperam o valor aparecer no cache
  async comTrava(condominio: number): Promise<Painel> {
    const guardado = await this.#lerCache(condominio);
    if (guardado) return guardado;
    const trava = `trava:${chave(condominio)}`;
    const dono = await pegarTrava(this.#redis, trava, 5000);
    if (dono) {
      try {
        return await this.#carregar(condominio);
      } finally {
        await soltarTrava(this.#redis, trava, dono);
      }
    }
    for (let i = 0; i < 150; i++) {
      await new Promise((ok) => setTimeout(ok, 20));
      const pronto = await this.#lerCache(condominio);
      if (pronto) return pronto;
    }
    // Quem segurava a trava falhou: vai ao banco, em vez de esperar para sempre
    return this.#carregar(condominio);
  }

  // Depois de uma mudança, o dado do cache fica velho: apaga, e a próxima leitura
  // recarrega
  async invalidar(condominio: number) {
    await this.#redis.del(chave(condominio));
  }
}
