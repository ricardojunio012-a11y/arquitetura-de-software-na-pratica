// Um balanceador do lado do cliente: reveza entre as réplicas e, se pedido,
// tenta a próxima quando uma não atende.
export interface Replica {
  nome: string;
  zona: string;
}

export type Transporte = (replica: Replica) => Promise<boolean>;

export class Balanceador {
  private proxima = 0;
  private replicas: Replica[];
  private transporte: Transporte;
  private tentarOutra: boolean;

  constructor(replicas: Replica[], transporte: Transporte, tentarOutra: boolean) {
    this.replicas = replicas;
    this.transporte = transporte;
    this.tentarOutra = tentarOutra;
  }

  async pedir(): Promise<boolean> {
    const n = this.replicas.length;
    const inicio = this.proxima;
    this.proxima = (this.proxima + 1) % n;
    const tentativas = this.tentarOutra ? n : 1;
    for (let i = 0; i < tentativas; i++) {
      if (await this.transporte(this.replicas[(inicio + i) % n])) return true;
    }
    return false;
  }
}
