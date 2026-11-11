// Onde a sessão do síndico fica guardada. Na memória do processo, ela só existe na
// réplica que fez o login; no Redis, qualquer réplica a encontra.
import { createClient } from "redis";

export interface Sessoes {
  criar(id: string, sindico: string): Promise<void>;
  buscar(id: string): Promise<string | null>;
}

export class SessoesEmMemoria implements Sessoes {
  readonly #mapa = new Map<string, string>();

  async criar(id: string, sindico: string) {
    this.#mapa.set(id, sindico);
  }

  async buscar(id: string) {
    return this.#mapa.get(id) ?? null;
  }
}

const OITO_HORAS = 8 * 60 * 60;

export class SessoesNoRedis implements Sessoes {
  readonly #redis: ReturnType<typeof createClient>;

  private constructor(redis: ReturnType<typeof createClient>) {
    this.#redis = redis;
  }

  // Um construtor não pode esperar a conexão. A fábrica espera: se o Redis estiver
  // fora do ar, a réplica falha ao subir, e não com um erro solto no primeiro pedido
  static async conectar(url: string): Promise<SessoesNoRedis> {
    const redis = createClient({ url });
    await redis.connect();
    return new SessoesNoRedis(redis);
  }

  // A sessão expira sozinha, como expiraria o cookie
  async criar(id: string, sindico: string) {
    await this.#redis.set(`sessao:${id}`, sindico, { EX: OITO_HORAS });
  }

  async buscar(id: string) {
    return this.#redis.get(`sessao:${id}`);
  }
}
